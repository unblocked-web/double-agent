import OriginType from '@double-agent/runner/interfaces/OriginType';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import { inspect } from 'util';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import CookieProfile from './CookieProfile';
import { diffArrays } from 'diff';
import { flaggedCheckFromRequest } from '@double-agent/runner/lib/flagUtils';
import { isAgent } from '@double-agent/runner/lib/userAgentUtils';

export default function checkCookieRequest(ctx: IRequestContext) {
  const browserProfile = CookieProfile.getProfileForSession(ctx);

  if (!browserProfile) return;

  let browserProfileRequest = browserProfile.requests.find(
    x => x.url === ctx.requestDetails.url && x.originType === ctx.requestDetails.originType,
  );

  // if requesting a document, don't need to test that origin type is correct here
  if (browserProfileRequest && ctx.requestDetails.resourceType === ResourceType.Document) {
    browserProfileRequest = browserProfile.requests.find(x => x.url === ctx.requestDetails.url);
  }

  if (!browserProfileRequest) {
    console.log(
      'No cookie profile for %s from origin: %s',
      ctx.requestDetails.url,
      ctx.requestDetails.originType,
    );
    return;
  }

  const userRequest = ctx.requestDetails;

  // remove js cookie since it can cause timing issues
  const profileCookies = jsRemove(browserProfileRequest.cookieNames, 'Main-JsCookies').sort();
  const userCookies = jsRemove(Object.keys(userRequest.cookies), 'Main-JsCookies').sort();

  if (userCookies.join(',') !== profileCookies.join(',')) {
    // chrome 80 still seems to be toggling on/off requiring secure cookies for SameSiteNone
    if (isAgent(ctx.session.parsedUseragent, 'Chrome', 80)) {
      if (allDifferencesFromNonSecureSameNoneCookies(profileCookies, userCookies)) {
        return;
      }
    }

    console.log(
      'Cookies different!! (%s from origin:%s)',
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

    ctx.session.flaggedChecks.push({
      ...check,
      pctBot: 99,
      checkName: `Sends ${userRequest.resourceType} Cookies`,
      description: `Check for the cookies for ${userRequest.resourceType} requests from origin: ${userRequest.originType}`,
      value: userCookies.join(','),
      expected: profileCookies.join(','),
    });
  }
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

function jsRemove(arr: string[], item: string) {
  const idx = arr.indexOf(item);
  if (idx !== -1) {
    arr.splice(idx, 1);
  }
  return arr;
}
