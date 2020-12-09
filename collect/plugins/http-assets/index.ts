import fs from 'fs';
import Plugin, { IPluginPage } from '@double-agent/collect/lib/Plugin';
import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import Document from '@double-agent/collect/lib/Document';
import { DomainType } from '@double-agent/collect/lib/DomainUtils';
import { IProfileData } from './interfaces/IProfile';

const contentTypeByPath = {
  '/test.js': 'application/javascript',
  '/test.css': 'text/css',
  '/test.svg': 'image/svg+xml',
  '/test.png': 'image/png',
  '/css-background.png': 'image/png',
};

const cachedAssetsByPath: { [path: string]: Buffer } = {};

export default class HttpHeadersPlugin extends Plugin {
  public initialize() {
    this.registerRoute('all', '/', this.sendDocument);

    this.registerRoute('all', '/test.js', this.saveHeadersAndSendAsset, this.savePreflightHeaders);
    this.registerRoute('all', '/test.css', this.saveHeadersAndSendAsset, this.savePreflightHeaders);
    this.registerRoute('all', '/test.svg', this.saveHeadersAndSendAsset, this.savePreflightHeaders);
    this.registerRoute('all', '/test.png', this.saveHeadersAndSendAsset, this.savePreflightHeaders);
    this.registerRoute(
      'all',
      '/css-background.png',
      this.saveHeadersAndSendAsset,
      this.savePreflightHeaders,
    );

    const pages: IPluginPage[] = [];

    ['http', 'https'].forEach(protocol => {
      pages.push({ route: this.routes[protocol]['/'], waitForReady: true });
    });

    this.registerPages(...pages);
  }

  public sendDocument(ctx: IRequestContext) {
    const document = new Document(ctx);
    for (const domainType of [
      DomainType.MainDomain,
      DomainType.SubDomain,
      DomainType.CrossDomain,
    ]) {
      document.injectHeadTag(`<script src="${ctx.buildUrl('/test.js', domainType)}"></script>`);
      document.injectHeadTag(
        `<link rel="stylesheet" type="text/css" href="${ctx.buildUrl('/test.css', domainType)}" />`,
      );
      document.injectBodyTag(`<img src="${ctx.buildUrl('/test.png', domainType)}" />`);
      document.injectBodyTag(`<img src="${ctx.buildUrl('/test.svg', domainType)}" />`);
    }
    ctx.res.end(document.html);
  }

  public savePreflightHeaders(ctx: IRequestContext) {
    saveHeadersToProfile(this, ctx);
  }

  public saveHeadersAndSendAsset(ctx: IRequestContext) {
    saveHeadersToProfile(this, ctx);

    const pathname = ctx.url.pathname.replace(`/${this.id}`, '');
    if (!cachedAssetsByPath[pathname]) {
      cachedAssetsByPath[pathname] = fs.readFileSync(`${__dirname}/public${pathname}`);
    }

    let assetContents: any = cachedAssetsByPath[pathname];
    if (pathname === '/test.css') {
      const imagePath = '/css-background.png';
      assetContents = assetContents
        .toString()
        .replace(imagePath, ctx.buildUrl(imagePath, DomainType.MainDomain));
    }

    ctx.res.writeHead(200, { 'Content-Type': contentTypeByPath[pathname] });
    ctx.res.end(assetContents);
  }
}

/////// /////////////////

// ToDo: Set ResourceType
// function getResourceCategory(request: IRequestDetails) {
//   const siteType = request.secureDomain ? 'Https' : 'Http';
//   switch (request.resourceType) {
//     case ResourceType.Document:
//     case ResourceType.Redirect:
//       return `Standard ${siteType} Headers`;
//     case ResourceType.WebsocketUpgrade:
//       return 'Websocket Headers';
//     case ResourceType.Stylesheet:
//     case ResourceType.Script:
//     case ResourceType.Image:
//       return 'Asset Headers';
//     case ResourceType.Preflight:
//       return 'Cors Preflight Headers';
//     case ResourceType.Xhr:
//       return 'Xhr Headers';
//     default:
//       return null;
//   }

function saveHeadersToProfile(plugin: Plugin, ctx: IRequestContext) {
  const pathname = ctx.url.pathname;
  const { domainType, originType, method, referer } = ctx.requestDetails;
  const protocol = ctx.server.protocol;
  const pageName = undefined;
  const rawHeaders: string[][] = [];
  for (let i = 0; i < ctx.req.rawHeaders.length; i += 2) {
    const key = ctx.req.rawHeaders[i];
    const value = ctx.req.rawHeaders[i + 1];
    rawHeaders.push([key, value]);
  }

  const profileData = ctx.session.getPluginProfileData<IProfileData>(plugin, []);
  profileData.push({
    pageName,
    method,
    protocol,
    domainType,
    originType,
    pathname,
    referer,
    rawHeaders,
  });
  ctx.session.savePluginProfileData<IProfileData>(plugin, profileData, { keepInMemory: true });
}
