import CookieProfile from './CookieProfile';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import HostDomain from '@double-agent/runner/interfaces/HostDomain';
import OriginType from '@double-agent/runner/interfaces/OriginType';

export default (profile: CookieProfile, ctx: IRequestContext) => {
  const browserProfile = CookieProfile.getProfileForSession(ctx);

  if (!browserProfile) return;

  const baseCheck: IFlaggedCheck = {
    secureDomain: ctx.requestDetails.secureDomain,
    pctBot: 99,
    category: 'Cookie Support',
    hostDomain: HostDomain.Main,
    originType: OriginType.None,
    resourceType: ResourceType.Document,
    layer: 'http',
    checkName: null,
    value: null,
  };

  const requests = profile.requests;
  const flagIfNoCookies = !requests.some(x => x.cookieNames?.length);
  ctx.session.recordCheck(flagIfNoCookies, {
    ...baseCheck,
    pctBot: 100,
    checkName: 'Http Cookies',
    description: 'Check if a user agent can set any cookies',
  });

  const flagIfNoJavascriptCookies = !requests.some(x => x.cookieNames?.some(y => y.includes('-Js')));
  ctx.session.recordCheck(flagIfNoJavascriptCookies, {
    ...baseCheck,
    checkName: 'Javascript Cookies',
    description: 'Checks if a user agent can set cookies via javascript "in-page"',
  });

  const flagIfHASExpiredCookies = requests.some(x => x.cookieNames?.includes('-Expired'));
  ctx.session.recordCheck(flagIfHASExpiredCookies, {
    ...baseCheck,
    checkName: "Don't Set Expired Cookies",
    description: 'Checks that a user agent ignores expired cookies',
  });

  ctx.session.pluginsRun.push(`http${ctx.requestDetails.secureDomain ? 's' : ''}/cookies`);
};
