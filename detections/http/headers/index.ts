import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import generateXhrTests from './lib/generateXhrTests';
import HeaderProfile from './lib/HeaderProfile';
import getBrowserProfileStats from './lib/getBrowserProfileStats';
import runChecks, { IResourceCheck } from './checks';
import OriginType from '@double-agent/runner/interfaces/OriginType';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';

export default class HttpHeadersPlugin implements IDetectionPlugin {
  public async onRequest(ctx: IRequestContext) {
    if (ctx.url.pathname === '/run-page') {
      const xhrs = generateXhrTests(ctx);

      ctx.extraScripts.push(`
<script type="text/javascript">
  const urls = ${JSON.stringify(xhrs)};
  window.pageQueue.push(...urls.map(x => {
    if (x.func === 'axios.get') return axios.get(x.url, x.args || {}).catch(console.log);
    else if (x.func === 'ws') return ws(x.url);
    else fetch(x.url, x.args || {}).catch(console.log);
  }));
</script>`);
    }
    if (ctx.url.pathname === '/results') {
      const key = this.getCheckName(ctx);
      // if results page loaded, the page load command didn't happen (ie, no js)
      if (!ctx.session.pluginsRun.includes(key)) {
        ctx.session.pluginsRun.push(key);
        const profile = new HeaderProfile(ctx.session);
        if (ctx.requestDetails.secureDomain === false) {
          profile.save();
        }
        this.checkUserProfile(profile, ctx.requestDetails.secureDomain);
      }
    }
  }

  public async handleResponse(ctx: IRequestContext): Promise<boolean> {
    const requestUrl = ctx.url;
    if (requestUrl.pathname.includes('headers.json') || requestUrl.pathname.endsWith('headers')) {
      const res = ctx.res;

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ctx.domains.listeningDomains.main.href,
        'X-Content-Type-Options': 'nosniff',
      });

      res.end(JSON.stringify({ message: true }));
      return true;
    }
    return false;
  }

  private getCheckName(ctx: IRequestContext) {
    return ctx.requestDetails.secureDomain ? 'https/headers' : 'http/headers';
  }

  private checkUserProfile(profile: HeaderProfile, secureDomain: boolean) {
    try {
      const analysis = getBrowserProfileStats();
      const browserVersion = profile.browserAndVersion;
      const browserStats = analysis.statsByBrowserVersion[browserVersion];
      if (!browserStats) return;

      const checks: IResourceCheck[] = [];
      const siteType = secureDomain ? 'Https' : 'Http';

      checks.push({
        category: `Standard ${siteType} Headers`,
        originType: OriginType.SameSite,
        resourceType: ResourceType.Document,
        secureDomain,
      });

      checks.push({
        category: `Redirect ${siteType} Headers`,
        originType: OriginType.CrossSite,
        resourceType: ResourceType.Document,
        secureDomain,
      });

      for (const origin in OriginType) {
        const originType = OriginType[origin];

        checks.push({
          secureDomain,
          originType,
          category: 'Websocket Headers',
          resourceType: ResourceType.WebsocketUpgrade,
          extraBrowserDefaultHeaders: [
            'Upgrade',
            'Sec-WebSocket-Version',
            'Sec-WebSocket-Extensions',
          ],
        });

        checks.push(
          {
            secureDomain,
            originType,
            category: 'Asset Headers',
            resourceType: ResourceType.Stylesheet,
          },
          {
            secureDomain,
            originType,
            category: 'Asset Headers',
            resourceType: ResourceType.Script,
          },
          {
            secureDomain,
            originType,
            category: 'Asset Headers',
            resourceType: ResourceType.Image,
            refererFilter: '/main.css', // image from stylesheet
            descriptionExtra:
              ' This check is for an image loaded from inside a stylesheet has matching headers',
          },
          {
            secureDomain,
            originType,
            category: 'Asset Headers',
            resourceType: ResourceType.Image,
            checkHeaderCaseOnly: true,
            urlFilter: 'icon-wildcard.svg',
            refererFilter: 'run-page',
          },
          {
            secureDomain,
            originType,
            category: 'Xhr Headers',
            resourceType: ResourceType.Xhr,
            urlFilter: 'axios-no-headers',
            checkHeaderCaseOnly: true,
          },
          {
            secureDomain,
            originType,
            category: 'Xhr Headers',
            resourceType: ResourceType.Xhr,
            urlFilter: 'fetch-noheaders',
            checkHeaderCaseOnly: true,
          },
          {
            secureDomain,
            originType,
            category: 'Xhr Headers',
            resourceType: ResourceType.Xhr,
            urlFilter: 'fetch-post-noheaders',
            checkHeaderCaseOnly: true,
            httpMethod: 'POST',
          },
        );

        if (originType !== OriginType.SameOrigin) {
          checks.push({
            secureDomain,
            originType,
            category: 'Cors Preflight Headers',
            resourceType: ResourceType.Preflight,
          });
        }
      }

      runChecks(profile, browserStats, checks);
    } catch (err) {
      console.log('ERROR processing header profile', err);
    }
  }
}
