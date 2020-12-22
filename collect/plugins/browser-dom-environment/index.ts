import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import { createPromise, IResolvablePromise } from '@double-agent/collect/lib/PromiseUtils';
import Plugin, { IPluginPage } from '@double-agent/collect/lib/Plugin';
import Document from '@double-agent/collect/lib/Document';
import domScript from './domScript';
import { IProfileData } from './interfaces/IProfile';

export default class BrowserDomPlugin extends Plugin {
  private pendingByKey: { [key: string]: IResolvablePromise } = {};

  public initialize() {
    this.registerRoute('all', '/', this.loadScript);
    this.registerRoute('all', '/save', this.save);

    this.registerRoute('all', '/wait-until-finished', this.waitUntilFinished);
    this.registerRoute('all', '/wait-until-finished.js', this.waitUntilFinishedJs);

    const pages: IPluginPage[] = [];
    ['http', 'https'].forEach(protocol => {
      pages.push({ route: this.routes[protocol]['/'], waitForReady: true });
    });
    this.registerPages(...pages);
  }

  private loadScript(ctx: IRequestContext) {
    const pendingKey = `${ctx.session.id}:${ctx.url.protocol}`;
    const document = new Document(ctx);
    document.injectBodyTag(domScript(ctx));
    if (this.pendingByKey[pendingKey]) {
      document.injectFooterTag(`<script src="${ctx.buildUrl('/wait-until-finished.js')}"></script>`);
    }
    ctx.res.end(document.html);
  }

  private async save(ctx: IRequestContext) {
    const filenameSuffix = ctx.url.protocol.replace(':', '');
    const pendingKey = `${ctx.session.id}:${ctx.url.protocol}`;
    const profileData = ctx.requestDetails.bodyJson as IProfileData;
    ctx.session.savePluginProfileData<IProfileData>(this, profileData, { filenameSuffix });
    this.pendingByKey[pendingKey]?.resolve();
    ctx.res.end();
  }

  private async waitUntilFinished(ctx: IRequestContext) {
    const pendingKey = `${ctx.session.id}:${ctx.url.protocol}`;
    this.pendingByKey[pendingKey] = createPromise();
    await this.pendingByKey[pendingKey].promise;
    ctx.res.end();
  }

  private async waitUntilFinishedJs(ctx: IRequestContext) {
    const pendingKey = `${ctx.session.id}:${ctx.url.protocol}`;
    await this.pendingByKey[pendingKey]?.promise;
    delete this.pendingByKey[pendingKey];
    ctx.res.writeHead(200, { 'Content-Type': 'application/javascript' });
    ctx.res.end('');
  }
}
