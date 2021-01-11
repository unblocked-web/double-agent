import Plugin, { IPluginPage } from '@double-agent/collect/lib/Plugin';
import { CrossDomain, MainDomain } from '@double-agent/collect';
import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import Document from '@double-agent/collect/lib/Document';
import { IProfileData } from './interfaces/IProfile';

export default class HttpHeadersPlugin extends Plugin {
  public initialize() {
    this.registerRoute('all', '/start', this.saveAndLinkToNextPage);
    this.registerRoute('all', '/page1', this.saveAndLinkToNextPage);
    this.registerRoute('all', '/page2', this.saveAndLinkToNextPage);
    this.registerRoute('all', '/page3', this.saveAndLinkToNextPage);
    this.registerRoute('all', '/linkToNext', this.linkToNextPage);
    this.registerRoute('all', '/useJsToLoadNextPage', this.saveAndUseJsToLoadNextPage);
    this.registerRoute('all', '/redirectToNextPage', this.saveAndRedirectToNextPage);
    this.registerRoute('all', '/gotoNext', this.showGotoNextPage);

    const pages: IPluginPage[] = [];

    ['http', 'https'].forEach(protocol => { // , 'http2'
      pages.push(
        {
          route: this.routes[protocol]['/start'],
          domain: MainDomain,
          clickNext: true,
          name: 'LoadedDirect',
        },
        { route: this.routes[protocol]['/linkToNext'], domain: CrossDomain, clickNext: true },
        {
          route: this.routes[protocol]['/page1'],
          domain: MainDomain,
          clickNext: true,
          name: 'ClickedFromCrossDomain',
        },
        {
          route: this.routes[protocol]['/useJsToLoadNextPage'],
          domain: MainDomain,
          isRedirect: true,
          name: 'ClickedFromSameDomain',
        },
        {
          route: this.routes[protocol]['/page2'],
          domain: MainDomain,
          clickNext: true,
          name: 'JsRedirectedFromSameDomain',
        },
        {
          route: this.routes[protocol]['/redirectToNextPage'],
          domain: MainDomain,
          isRedirect: true,
        },
        {
          route: this.routes[protocol]['/page3'],
          domain: MainDomain,
          clickNext: true,
          name: 'RedirectedFromSameDomain',
        },
        {
          route: this.routes[protocol]['/page2'],
          domain: MainDomain,
          clickNext: true,
          name: 'LoadedSamePageAgain',
        },
        { route: this.routes[protocol]['/gotoNext'], domain: MainDomain, waitForReady: true },
      );
    });

    this.registerPages(...pages);
  }

  public linkToNextPage(ctx: IRequestContext) {
    const document = new Document(ctx);
    document.addNextPageClick();
    ctx.res.end(document.html);
  }

  public showGotoNextPage(ctx: IRequestContext) {
    const document = new Document(ctx);
    ctx.res.end(document.html);
  }

  public saveAndLinkToNextPage(ctx: IRequestContext) {
    const document = new Document(ctx);
    document.addNextPageClick();
    saveHeadersToProfile(this, ctx);
    ctx.res.end(document.html);
  }

  public saveAndRedirectToNextPage(ctx: IRequestContext) {
    ctx.res.writeHead(302, { location: ctx.nextPageLink });
    ctx.res.end();
  }

  public saveAndUseJsToLoadNextPage(ctx: IRequestContext) {
    const document = new Document(ctx);
    document.injectBodyTag(`<script type="text/javascript">
      (function() {
        window.afterReady = () => {
          setTimeout(() => {
            window.location.href = '${ctx.nextPageLink}';
          }, 2e3);
        }
      })();
    </script>`);
    saveHeadersToProfile(this, ctx);
    ctx.res.end(document.html);
  }
}

/////// /////////////////

function saveHeadersToProfile(plugin: Plugin, ctx: IRequestContext) {
  const pathname = ctx.url.pathname;
  const { domainType, originType, method, referer } = ctx.requestDetails;
  const protocol = ctx.server.protocol;
  const pageName = ctx.page.name;
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
  ctx.session.savePluginProfileData<IProfileData>(plugin, profileData, {
    keepInMemory: true,
  });
}
