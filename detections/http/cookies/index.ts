import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import CookieProfile from './lib/CookieProfile';
import checkCookieProfile from './lib/checkCookieProfile';
import HostDomain from '@double-agent/runner/interfaces/HostDomain';

export default class HttpCookiesPlugin implements IDetectionPlugin {
  public async onRequest(ctx: IRequestContext) {
    const cookieDomain = ctx.requestDetails.hostDomain;

    switch (ctx.url.pathname) {
      case '/':
        ctx.extraScripts.push(jsCookieScript(cookieDomain));
        ctx.requestDetails.setCookies.push(
          `${cookieDomain}-ToBeExpired=start;`,
          ...getSetCookies(ctx, cookieDomain),
        );
        break;
      case '/run':
        ctx.requestDetails.setCookies.push(
          `${cookieDomain}-ToBeExpired=start; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
        );
        break;
      case '/run-redirect':
        ctx.requestDetails.setCookies.push(...getSetCookies(ctx, cookieDomain));
        break;
      case '/run-page':
        ctx.requestDetails.setCookies.push(...getSetCookies(ctx, cookieDomain));
        break;
      case '/results-page':
        this.testResults(ctx);
        break;

      default:
        break;
    }
  }

  private testResults(ctx: IRequestContext) {
    const profile = new CookieProfile(ctx);
    if (ctx.requestDetails.secureDomain === false) {
      profile.save();
    }

    checkCookieProfile(profile, ctx);
  }
}

function jsCookieScript(cookieDomain: HostDomain) {
  return `
<script>
    document.cookie = '${cookieDomain}-JsCookies=0';
    if(document.cookie.includes('HttpOnly-')) {
        document.cookie = '${cookieDomain}-CanReadHttpOnly=0';
    }
</script>`;
}

function getSetCookies(ctx: IRequestContext, origin: HostDomain) {
  const fullOrigin = (ctx.requestDetails.secureDomain ? 'Secure' : '') + origin;

  const cookies = [
    `${fullOrigin}=0`,
    `${fullOrigin}--Secure=0; Secure`,
    `${fullOrigin}--HttpOnly=0; HttpOnly`,
    `${fullOrigin}--Expired=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `${fullOrigin}--SameSiteLax=0; SameSite=Lax`,
    `${fullOrigin}--SameSiteStrict=0; SameSite=Strict`,
    `${fullOrigin}--SameSiteNone=0; SameSite=None`,
    `${fullOrigin}--Secure-SameSiteLax=0; Secure; SameSite=Lax`,
    `${fullOrigin}--Secure-SameSiteStrict=0; Secure; SameSite=Strict`,
    `${fullOrigin}--Secure-SameSiteNone=0; Secure; SameSite=None`,
    `__Secure-${fullOrigin}--Secure-SecurePrefix=0; Secure`,
    `__Host-${fullOrigin}--Secure-HostPrefix-RootPath=0; Secure; Path=/`,
  ];

  if (origin === HostDomain.Main || origin === HostDomain.Sub) {
    const hostDomain = ctx.domains.listeningDomains.main.host
      .split('.')
      .slice(-2)
      .join('.')
      .split(':') // remove port
      .shift();

    cookies.push(
      `${fullOrigin}--HttpOnly-RootDomain=0; HttpOnly; Domain=${hostDomain}`,
      `${fullOrigin}--RootDomain-SameSiteNone=0; SameSite=None; Domain=${hostDomain}`,
      `${fullOrigin}--RootDomain-Secure-SameSiteLax=0; Secure; SameSite=Lax; Domain=${hostDomain}`,
      `${fullOrigin}--RootDomain-Secure-SameSiteStrict=0; Secure; SameSite=Strict; Domain=${hostDomain}`,
      `${fullOrigin}--RootDomain-Secure-SameSiteNone=0; Secure; SameSite=None; Domain=${hostDomain}`,
    );
  }

  return cookies;
}
