import CookieProfile from './CookieProfile';
import { lookup } from 'useragent';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import HostDomain from '@double-agent/runner/interfaces/HostDomain';
import OriginType from '@double-agent/runner/interfaces/OriginType';
import { diffArrays } from 'diff';
import { inspect } from 'util';

export default (profile: CookieProfile, ctx: IRequestContext) => {
  const thisAgent = lookup(profile.useragent);
  const browserProfile = CookieProfile.getAllProfiles().find(x => {
    if (x.userAgent.major !== thisAgent.major) return false;
    return x.userAgent.family === thisAgent.family;
  });
  const requests = profile.requests;
  const session = ctx.session;

  const baseCheck: IFlaggedCheck = {
    secureDomain: ctx.requestDetails.secureDomain,
    pctBot: 99,
    category: 'Can Set Cookies',
    hostDomain: HostDomain.Main,
    originType: OriginType.None,
    resourceType: ResourceType.Document,
    layer: 'http',
    description: 'Check if a user agent can set cookies',
    checkName: null,
    value: null,
  };

  if (!requests.some(x => x.cookieNames?.length)) {
    session.flaggedChecks.push({
      ...baseCheck,
      pctBot: 100,
      checkName: 'Http Cookies',
    });
  }

  if (!requests.some(x => x.cookieNames?.some(y => y.includes('-Js')))) {
    session.flaggedChecks.push({
      ...baseCheck,
      checkName: 'Javascript Cookies',
      description: 'Checks if a user agent can set cookies via javascript "in-page"',
    });
  }

  if (requests.some(x => x.cookieNames?.includes('-Expired'))) {
    session.flaggedChecks.push({
      ...baseCheck,
      checkName: "Doesn't Set Expired Cookies",
      description: 'Checks that a user agent ignores expired cookies',
    });
  }

  for (const browserProfileRequest of browserProfile.requests.filter(
    x => x.secureDomain === ctx.requestDetails.secureDomain,
  )) {
    const requestIdx = requests.findIndex(
      x => x.url === browserProfileRequest.url && x.originType === browserProfileRequest.originType,
    );
    if (requestIdx === -1) {
      session.assetsNotLoaded.push({
        secureDomain: browserProfileRequest.secureDomain,
        resourceType: browserProfileRequest.resourceType,
        originType: browserProfileRequest.originType,
        hostDomain: browserProfileRequest.hostDomain,
        layer: 'http',
      });
      continue;
    }

    const userRequest = requests[requestIdx];

    const check = {
      ...baseCheck,
      resourceType: userRequest.resourceType,
      originType: userRequest.originType,
      hostDomain: userRequest.hostDomain,
      secureDomain: userRequest.secureDomain,
      requestIdx,
      checkName: `Sends ${userRequest.resourceType} Cookies`,
    } as IFlaggedCheck;

    let urlType = 'Page';

    if (userRequest.url.includes('.css')) {
      urlType = 'Stylesheet';
    }

    if (userRequest.secureDomain) {
      urlType = 'Secure ' + urlType;
      check.category = 'Secure Cookies';
    }

    if (userRequest.originType === OriginType.CrossSite) {
      urlType = 'Cross Site ' + urlType;
      check.category = 'Cross Site Cookies';
    }
    if (userRequest.originType === OriginType.SameSite) {
      urlType = 'Same Site ' + urlType;
      check.category = 'Same Site Cookies';
    }
    if (userRequest.originType === OriginType.SameOrigin) {
      urlType = 'Same Origin ' + urlType;
      check.category = 'Same Origin Cookies';
    }

    // remove js cookie since it can cause timing issues
    const profileCookies = jsRemove(browserProfileRequest.cookieNames, 'Main-JsCookies').sort();
    const userCookies = jsRemove(userRequest.cookieNames, 'Main-JsCookies').sort();

    if (userCookies.join(',') !== profileCookies.join(',')) {
      // chrome 80 still seems to be toggling on/off requiring secure cookies for SameSiteNone
      if (
        ctx.session.parsedUseragent.family === 'Chrome' &&
        ctx.session.parsedUseragent.major === '80'
      ) {
        if (allDifferencesFromNonSecureSameNoneCookies(profileCookies, userCookies)) {
          continue;
        }
      }

      console.log(
        'Cookies different!! (Match on %s and %s)',
        browserProfileRequest.url,
        browserProfileRequest.originType,
        inspect(
          {
            userRequest,
            browserProfileRequest,
          },
          false,
          null,
          true,
        ),
      );

      session.flaggedChecks.push({
        ...check,
        pctBot: 99,
        value: userCookies.join(','),
        expected: profileCookies.join(','),
      });
    }
  }
  ctx.session.pluginsRun.push(`http${ctx.requestDetails.secureDomain ? 's' : ''}/cookies`);
};

function allDifferencesFromNonSecureSameNoneCookies(
  profileCookies: string[],
  userCookies: string[],
) {
  // chrome 80 starts a/b testing for sending ONLY SameSite=None cookies that are "Secure" to cross-site
  const diff = diffArrays(profileCookies, userCookies);
  for (const item of diff) {
    if (!item.added && !item.removed) continue;
    for (const name of item.value) {
      if (name.includes('SameSiteNone') && name.includes('-Secure-')) return false;
    }
  }
  return true;
}

function jsRemove(arr: string[], item: string) {
  const idx = arr.indexOf(item);
  if (idx !== -1) {
    arr.splice(idx, 1);
  }
  return arr;
}
