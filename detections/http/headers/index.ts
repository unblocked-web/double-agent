import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import generateXhrTests from './lib/generateXhrTests';
import HeaderProfile from './lib/HeaderProfile';
import getBrowserProfileStats from './lib/getBrowserProfileStats';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import { getAgentBrowser } from '@double-agent/runner/lib/profileHelper';
import checkRequestHeaders from './checks/checkRequestHeaders';
import IRequestDetails from '@double-agent/runner/interfaces/IRequestDetails';
import HostDomain from '@double-agent/runner/interfaces/HostDomain';

export default class HttpHeadersPlugin implements IDetectionPlugin {
  private browserStats = getBrowserProfileStats();
  public async onRequest(ctx: IRequestContext) {
    if (ctx.url.pathname === '/') {
      ctx.extraScripts.push(`
<script type="text/javascript">
  window.pageQueue.push(fetch('${ctx.trackUrl(
    'fetch-samesite-headers.json',
    HostDomain.Sub,
  )}', { mode: 'cors' }).catch(console.log));
</script>`);
    }

    if (ctx.url.pathname === '/run-page') {
      const xhrs = generateXhrTests(ctx).map(x => {
        return {
          url: ctx.trackUrl(x.pathname, x.hostDomain),
          func: x.func,
          args: x.args,
        };
      });

      ctx.extraScripts.push(`
<script type="text/javascript">
  const urls = ${JSON.stringify(xhrs)};
  window.pageQueue.push(...urls.map(x => {
    if (x.func === 'axios.get') return axios.get(x.url, x.args || {}).catch(console.log);
    else fetch(x.url, x.args || {}).catch(console.log);
  }));
</script>`);
    }

    if (ctx.url.pathname === '/results-page') {
      if (ctx.requestDetails.secureDomain === false) {
        const profile = new HeaderProfile(ctx.session);
        profile.save();
      }
    }

    this.checkRequest(ctx);
  }

  public async handleResponse(ctx: IRequestContext): Promise<boolean> {
    const requestUrl = ctx.url;
    if (requestUrl.pathname.includes('headers.json')) {
      const res = ctx.res;

      if (ctx.req.headers.origin) {
        res.setHeader('Access-Control-Allow-Origin', ctx.req.headers.origin);
      } else if (ctx.req.headers.referer) {
        res.setHeader('Access-Control-Allow-Origin', new URL(ctx.req.headers.referer).origin);
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      });

      res.end(JSON.stringify({ message: true }));
      return true;
    }
    return false;
  }

  private checkRequest(ctx: IRequestContext) {
    const browserVersion = getAgentBrowser(ctx.session.parsedUseragent);
    const browserStats = this.browserStats.statsByBrowserVersion[browserVersion];
    if (!browserStats) {
      console.log('No Header checks for profile - no browser stats', browserVersion);
      return;
    }

    const category = getResourceCategory(ctx.requestDetails);
    // if nothing returned, means we're not testing this category
    if (!category) return;

    let extraDescription: string;
    let checkHeaderCaseOnly = false;
    let extraDefaultHeaders: string[];

    if (ctx.requestDetails.resourceType === ResourceType.WebsocketUpgrade) {
      extraDefaultHeaders = ['Upgrade', 'Sec-WebSocket-Version', 'Sec-WebSocket-Extensions'];
    }

    const pathname = ctx.url.pathname;
    const referer = ctx.requestDetails.referer ?? '';
    const resource = ctx.requestDetails.resourceType;

    if (resource === ResourceType.Preflight) {
      checkHeaderCaseOnly = true;
    }

    if (resource === ResourceType.Image) {
      if (referer.includes('/main.css')) {
        extraDescription =
          ' This check is for an image loaded from inside a stylesheet has matching headers';
      } else if (pathname.includes('icon-wildcard.svg') && referer.includes('run-page')) {
        checkHeaderCaseOnly = true;
      } else {
        return;
      }
    }

    if (resource === ResourceType.Xhr) {
      const shouldInclude =
        pathname.endsWith('nocustomheaders.json') || pathname === 'fetch-samesite-headers.json';
      if (shouldInclude === false) return;

      checkHeaderCaseOnly = true;
    }

    const pluginName = ctx.requestDetails.secureDomain ? 'https/headers' : 'http/headers';
    if (!ctx.session.pluginsRun.includes(pluginName)) ctx.session.pluginsRun.push(pluginName);

    checkRequestHeaders(
      ctx,
      browserStats,
      category,
      checkHeaderCaseOnly,
      extraDefaultHeaders,
      extraDescription,
    );
  }
}

function getResourceCategory(request: IRequestDetails) {
  const siteType = request.secureDomain ? 'Https' : 'Http';
  switch (request.resourceType) {
    case ResourceType.Document:
    case ResourceType.Redirect:
      return `Standard ${siteType} Headers`;
    case ResourceType.WebsocketUpgrade:
      return 'Websocket Headers';
    case ResourceType.Stylesheet:
    case ResourceType.Script:
    case ResourceType.Image:
      return 'Asset Headers';
    case ResourceType.Preflight:
      return 'Cors Preflight Headers';
    case ResourceType.Xhr:
      return 'Xhr Headers';
    default:
      return null;
  }
}
