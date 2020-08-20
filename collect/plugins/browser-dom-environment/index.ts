import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import { createPromise, IResolvablePromise } from '@double-agent/collect/lib/PromiseUtils';
import Plugin, { IPluginPage } from '@double-agent/collect/lib/Plugin';
import Document from '@double-agent/collect/lib/Document';
import domScript from './domScript';
import { IProfileData } from './interfaces/IProfile';

export default class BrowserDomPlugin extends Plugin {
  private pendingByKey: { [key: string]: IResolvablePromise } = {};

  public initialize() {
    this.registerRoute('all', '/dom1', this.loadScript);
    this.registerRoute('all', '/dom2', this.loadScript);
    this.registerRoute('all', '/save', this.save);
    this.registerRoute('all', '/wait-forever.js', this.waitForeverJs);

    const pages: IPluginPage[] = [];
    ['http', 'https'].forEach(protocol => {
      pages.push(
        { name: 'dom1', route: this.routes[protocol]['/dom1'], clickNext: true },
        { name: 'dom2', route: this.routes[protocol]['/dom2'], waitForReady: true },
      );
    });
    this.registerPages(...pages);
  }

  private loadScript(ctx: IRequestContext) {
    const key = `${ctx.session.id}:${ctx.page.name}`;
    this.pendingByKey[key] = createPromise();
    const document = new Document(ctx);
    document.injectBodyTag(domScript(ctx, ctx.page.name));
    document.injectFooterTag(`<script src="${ctx.buildUrl('/wait-forever.js')}&key=${key}" />`);
    if (ctx.page.clickNext) {
      document.addNextPageClick();
    }
    ctx.res.end(document.html);
  }

  private async save(ctx: IRequestContext) {
    const name = ctx.url.searchParams.get('name');
    const key = `${ctx.session.id}:${name}`;
    const protocol = ctx.url.protocol.replace(':', '');
    const filenameSuffix = `-${protocol}-${name.replace('dom', '')}`;
    this.pendingByKey[key]?.resolve();
    const profileData = ctx.requestDetails.bodyJson as IProfileData;
    ctx.session.savePluginProfileData<IProfileData>(this, profileData, { filenameSuffix });
    ctx.res.end();
  }

  private async waitForeverJs(ctx: IRequestContext) {
    const key = ctx.url.searchParams.get('key');
    await this.pendingByKey[key]?.promise;
    delete this.pendingByKey[key];
    ctx.res.end();
  }
}
