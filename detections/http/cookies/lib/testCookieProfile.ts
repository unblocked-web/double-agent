import CookieProfile from './CookieProfile';
import { lookup } from 'useragent';

export default function testCookieProfile(profile: CookieProfile) {
  const results: IDetectorResult[] = [];

  const type = profile.domains.isSsl ? 'https' : 'http';
  const thisAgent = lookup(profile.useragent);
  const browserProfile = CookieProfile.getAllProfiles(type).find(x => {
    if (x.userAgent.major !== thisAgent.major) return false;
    if (x.userAgent.family !== thisAgent.family) return false;
    return true;
  });
  const requests = profile.cleanedRequests;

  results.push({
    category: 'Can Set Cookies',
    testName: 'Http Cookies',
    success: requests.some(x => !!x.cookies),
  });

  results.push({
    category: 'Can Set Cookies',
    testName: 'Javascript Cookies',
    success: requests.some(x => x.cookies?.includes('-Js')),
  });

  results.push({
    category: 'Can Set Cookies',
    testName: "Doesn't Set Expired Cookies",
    success: !requests.some(x => x.cookies?.includes('-Expired')),
  });

  results.push({
    category: 'Can Set Cookies',
    testName: 'Expires Set Cookies',
    success: requests.filter(x => x.cookies?.includes('-ToBeExpired')).length === 1,
    value:
      String(requests.filter(x => x.cookies?.includes('-ToBeExpired')).length) +
      ' Requests with -ToBeExpired',
    expected: '1',
  });

  for (const request of browserProfile.requests) {
    const profileRequest = requests.find(x => x.url === request.url);

    const referer = !request.referer
      ? 'None'
      : request.referer.includes('sameSite')
      ? 'SameSite'
      : request.referer.includes('crossSite')
      ? 'CrossSite'
      : 'MainSite';

    let urlType = 'Page';
    let category = 'Can Set Cookies';
    if (request.url.includes('.css')) {
      urlType = 'Stylesheet';
    }
    if (request.url.includes('https://')) {
      urlType = 'Secure ' + urlType;
      category = 'Secure Cookies';
    }

    if (request.url.includes('crossSite')) {
      if (referer !== 'CrossSite') {
        urlType = 'Cross Domain ' + urlType;
      }
    } else {
      if (referer === 'MainSite' && !request.url.includes('mainSite')) {
        urlType = 'Same Site ' + urlType;
      }
      if (referer === 'CrossSite') {
        urlType = 'Cross Site ' + urlType;
      }
    }

    if (urlType.includes('Same Site')) {
      category = 'Same Site Cookies';
    }
    if (urlType.includes('Cross Site')) {
      category = 'Cross Domain Cookies';
    }

    let result: IDetectorResult = {
      category,
      testName: urlType,
      success: false,
      url: request.url,
      referer: request.referer,
      expected: request.cookies,
      value: profileRequest?.cookies,
    };
    if (!profileRequest) {
      result.omitted = true;
    } else {
      result.success =
        profileRequest.cookies
          ?.split('; ')
          .sort()
          .toString() ===
        request.cookies
          ?.split('; ')
          .sort()
          .toString();
    }
    results.push(result);
  }

  return results;
}

interface IDetectorResult {
  success: boolean;
  category: string;
  testName: string;
  url?: string;
  referer?: string;
  omitted?: boolean;
  value?: string;
  expected?: string;
  reason?: string;
}
