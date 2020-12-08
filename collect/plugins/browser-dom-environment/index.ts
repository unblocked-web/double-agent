import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import { createPromise, IResolvablePromise } from '@double-agent/collect/lib/PromiseUtils';
import Plugin, { IPluginPage } from '@double-agent/collect/lib/Plugin';
import Document from '@double-agent/collect/lib/Document';
import domScript from './domScript';
import { IProfileData } from './interfaces/IProfile';

export default class BrowserDomPlugin extends Plugin {
  private pendingBySessionId: { [sessionId: string]: IResolvablePromise } = {};

  public initialize() {
    this.registerRoute('all', '/', this.loadScript);
    this.registerRoute('all', '/save', this.save);
    this.registerRoute('all', '/wait-forever.js', this.waitForeverJs);

    const pages: IPluginPage[] = [];
    ['http', 'https'].forEach(protocol => {
      pages.push({ route: this.routes[protocol]['/'], waitForReady: true });
    });
    this.registerPages(...pages);
  }

  private loadScript(ctx: IRequestContext) {
    this.pendingBySessionId[ctx.session.id] = createPromise();
    const document = new Document(ctx);
    document.injectBodyTag(domScript(ctx));
    document.injectFooterTag(`<script src="${ctx.buildUrl('/wait-forever.js')}" />`);
    ctx.res.end(document.html);
  }

  private async save(ctx: IRequestContext) {
    const filenameSuffix = `-${ctx.url.protocol.replace(':', '')}`;
    this.pendingBySessionId[ctx.session.id]?.resolve();
    const profileData = ctx.requestDetails.bodyJson as IProfileData;
    ctx.session.savePluginProfileData<IProfileData>(this, profileData, { filenameSuffix });
    ctx.res.end();
  }

  private async waitForeverJs(ctx: IRequestContext) {
    await this.pendingBySessionId[ctx.session.id]?.promise;
    delete this.pendingBySessionId[ctx.session.id];
    ctx.res.end();
  }
}
