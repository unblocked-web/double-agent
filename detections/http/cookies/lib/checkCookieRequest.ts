import OriginType from '@double-agent/runner/interfaces/OriginType';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import CookieProfile from './CookieProfile';
import { diffArrays } from 'diff';
import { flaggedCheckFromRequest } from '@double-agent/runner/lib/flagUtils';
import { isAgent } from '@double-agent/runner/lib/userAgentUtils';
import HostDomain from '@double-agent/runner/interfaces/HostDomain';

export default function checkCookieRequest(ctx: IRequestContext) {
  const browserProfile = CookieProfile.getProfileForSession(ctx);

  let browserProfileRequest = browserProfile?.requests.find(
    x => x.url === ctx.requestDetails.url && x.originType === ctx.requestDetails.originType,
  );

  // if requesting a document, don't need to test that origin type is correct here
  if (!browserProfileRequest && ctx.requestDetails.resourceType === ResourceType.Document) {
    browserProfileRequest = browserProfile?.requests.find(x => x.url === ctx.requestDetails.url);
  }

  const userRequest = ctx.requestDetails;

  // remove js cookie since it can cause timing issues
  const profileCookies =
    browserProfileRequest?.cookieNames
      .filter(x => x !== 'Main-JsCookies' && cookiePrefixes.some(y => x.startsWith(y)))
      .sort() ?? [];
  const userCookies = Object.keys(userRequest.cookies)
    .filter(x => x !== 'Main-JsCookies' && cookiePrefixes.some(y => x.startsWith(y)))
    .sort();

  let checkCategory = 'Cookie Support';

  if (userRequest.secureDomain) {
    checkCategory = 'Secure Cookies';
  }
  if (userRequest.originType === OriginType.CrossSite) {
    checkCategory = 'Cross Site Cookies';
  }
  if (userRequest.originType === OriginType.SameSite) {
    checkCategory = 'Same Site Cookies';
  }
  if (userRequest.originType === OriginType.SameOrigin) {
    checkCategory = 'Same Origin Cookies';
  }

  const check = flaggedCheckFromRequest(ctx, 'http', checkCategory);

  let flagHeader = !!browserProfileRequest && userCookies.join(',') !== profileCookies.join(',');
  // chrome 80 still seems to be toggling on/off requiring secure cookies for SameSiteNone
  if (flagHeader && isAgent(ctx.session.parsedUseragent, 'Chrome', 80)) {
    flagHeader = !allDifferencesFromNonSecureSameNoneCookies(profileCookies, userCookies);
  }

  ctx.session.recordCheck(flagHeader, {
    ...check,
    pctBot: 99,
    checkName: `Sends ${userRequest.resourceType} Cookies`,
    description: `Check for the cookies for ${userRequest.resourceType} requests from origin: ${userRequest.originType}`,
    value: userCookies.join(','),
    expected: profileCookies.join(','),
  });
}

const cookiePrefixes = [];
for (const host of [HostDomain.External, HostDomain.Main, HostDomain.Sub]) {
  cookiePrefixes.push(`${host}`, `Secure${host}`, `__Secure-${host}`, `__Host-${host}`);
}

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
