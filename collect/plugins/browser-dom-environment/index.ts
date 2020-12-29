import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import { createPromise, IResolvablePromise } from '@double-agent/collect/lib/PromiseUtils';
import Plugin, { IPluginPage } from '@double-agent/collect/lib/Plugin';
import Document from '@double-agent/collect/lib/Document';
import domScript from './domScript';
import { loadServiceWorker, serviceWorkerScript } from './serviceWorkerScripts';
import { loadSharedWorker, sharedWorkerScript } from './sharedWorkerScripts';
import { dedicatedWorkerScript, loadDedicatedWorker } from './dedicatedWorkerScripts';
import { IProfileData } from './interfaces/IProfile';
import PageNames from './interfaces/PageNames';

export default class BrowserDomPlugin extends Plugin {
  private pendingByKey: { [key: string]: IResolvablePromise } = {};

  public initialize() {
    this.registerRoute('allHttp1', '/', this.loadScript);
    this.registerRoute('allHttp1', '/save', this.save);
    this.registerRoute('allHttp1', '/load-dedicated-worker', this.loadDedicatedWorker);
    this.registerRoute('allHttp1', '/dedicated-worker.js', dedicatedWorkerScript);
    this.registerRoute('allHttp1', '/load-service-worker', this.loadServiceWorker);
    this.registerRoute('allHttp1', '/service-worker.js', serviceWorkerScript);
    this.registerRoute('allHttp1', '/load-shared-worker', this.loadSharedWorker);
    this.registerRoute('allHttp1', '/shared-worker.js', sharedWorkerScript);
    this.registerRoute('allHttp1', '/wait-until-finished', this.waitUntilFinished);
    this.registerRoute('allHttp1', '/wait-until-finished.js', this.waitUntilFinishedJs);

    const pages: IPluginPage[] = [];
    ['http', 'https'].forEach(protocol => {
      pages.push(
        { route: this.routes[protocol]['/'], waitForReady: true, name: PageNames.BrowserDom },
        {
          route: this.routes[protocol]['/load-service-worker'],
          waitForReady: true,
          name: PageNames.ServiceWorkerDom,
        },
        {
          route: this.routes[protocol]['/load-shared-worker'],
          waitForReady: true,
          name: PageNames.SharedWorkerDom,
        },
        {
          route: this.routes[protocol]['/load-dedicated-worker'],
          waitForReady: true,
          name: PageNames.DedicatedWorkerDom,
        },
      );
    });
    this.registerPages(...pages);
  }

  private loadScript(ctx: IRequestContext) {
    const document = new Document(ctx);
    document.injectBodyTag(`<script type="text/javascript">${domScript(ctx)}</script>`);
    this.addWaitIfNeeded(document, ctx);
    ctx.res.end(document.html);
  }

  private loadServiceWorker(ctx: IRequestContext) {
    const document = new Document(ctx);
    document.injectBodyTag(`${loadServiceWorker(ctx)}`);
    this.addWaitIfNeeded(document, ctx);
    ctx.res.end(document.html);
  }

  private loadDedicatedWorker(ctx: IRequestContext) {
    const document = new Document(ctx);
    document.injectBodyTag(`${loadDedicatedWorker(ctx)}`);
    this.addWaitIfNeeded(document, ctx);
    ctx.res.end(document.html);
  }

  private loadSharedWorker(ctx: IRequestContext) {
    const document = new Document(ctx);
    document.injectBodyTag(`${loadSharedWorker(ctx)}`);
    this.addWaitIfNeeded(document, ctx);

    ctx.res.end(document.html);
  }

  private async save(ctx: IRequestContext) {
    const pageName = ctx.req.headers['page-name'] || '';
    const pendingKey = this.getPendingKey(ctx, pageName as string);

    let filenameSuffix = ctx.url.protocol.replace(':', '');
    if (pageName === PageNames.ServiceWorkerDom) {
      filenameSuffix += '-service-worker';
    } else if (pageName === PageNames.SharedWorkerDom) {
      filenameSuffix += '-shared-worker';
    } else if (pageName === PageNames.DedicatedWorkerDom) {
      filenameSuffix += '-dedicated-worker';
    }
    const profileData = ctx.requestDetails.bodyJson as IProfileData;
    ctx.session.savePluginProfileData<IProfileData>(this, profileData, { filenameSuffix });
    this.pendingByKey[pendingKey]?.resolve();
    ctx.res.end();
  }

  private async waitUntilFinished(ctx: IRequestContext) {
    const pendingKey = this.getPendingKey(ctx, ctx.url.searchParams.get('pageName'));
    this.pendingByKey[pendingKey] = createPromise();
    await this.pendingByKey[pendingKey].promise;
    ctx.res.end();
  }

  private async waitUntilFinishedJs(ctx: IRequestContext) {
    const pendingKey = ctx.url.searchParams.get('pendingKey');
    await this.pendingByKey[pendingKey]?.promise;
    delete this.pendingByKey[pendingKey];
    ctx.res.writeHead(200, { 'Content-Type': 'application/javascript' });
    ctx.res.end('');
  }

  private addWaitIfNeeded(document: Document, ctx: IRequestContext) {
    const pendingKey = this.getPendingKey(ctx, ctx.page.name);
    if (this.pendingByKey[pendingKey]) {
      document.injectFooterTag(
        `<script src="${ctx.buildUrl(`/wait-until-finished.js?pendingKey=${pendingKey}`)}"></script>`,
      );
    }
  }

  private getPendingKey(ctx: IRequestContext, pageName: string) {
    let key = `${ctx.session.id}:${ctx.url.protocol}`;
    if (pageName) {
      key += `:${pageName}`;
    }
    return key;
  }
}
