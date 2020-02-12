import { IHeaderStats } from './getBrowserProfileStats';
import getDefaultHeaderOrder from './getDefaultHeaderOrder';
import Profile, { ICleanedRequestInfo } from './Profile';

export default function testProfile(
  profile: Profile,
  browserStats: { [type: string]: IHeaderStats },
) {
  const results: IDetectorResult[] = [];

  const userAgent = profile.userAgent;

  for (const request of profile.entries) {
    results.push({
      passed: request.userAgent === userAgent,
      resourceType: request.type,
      testName: 'User Agent consistency',
      value: request.userAgent,
      expected: userAgent,
    });
  }

  /**
   * Rules not yet tested for different use cases:
   * TODO:
   *  Cache-Control: sent on second request
   *  Sec-Fetch-User - will only show up user performed an activity to get to this page
   */

  checkResourceType('Document', null, true, false, [
    'Connection',
    'Upgrade-Insecure-Requests',
    'Sec-Fetch-User',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Websocket - Upgrade', null, true, false, [
    'Connection',
    'Upgrade',
    'Sec-WebSocket-Version',
    'Sec-WebSocket-Extensions',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Stylesheet', null, true, false, [
    'Connection',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Script', null, true, false, [
    'Connection',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Image', null, false, true, [
    'Connection',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Xhr', 'mainSite/axios-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  checkResourceType('Xhr', 'mainSite/fetch-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  checkResourceType('Xhr - Post', 'mainSite/fetch-post-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  /////// CROSS SITE //////

  checkResourceType('Cross Domain Websocket - Upgrade', null, true, false, [
    'Connection',
    'Upgrade',
    'Sec-WebSocket-Version',
    'Sec-WebSocket-Extensions',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Cross Domain Stylesheet', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Cross Domain Image', null, false, true, [
    'Connection',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Cross Domain Script', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Cross Domain Preflight', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Cross Domain Xhr', 'fetch-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  checkResourceType('Cross Domain Xhr - Post', 'fetch-post-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  /////// SAME SITE //////

  checkResourceType('Same Site Websocket - Upgrade', null, true, false, [
    'Connection',
    'Upgrade',
    'Sec-WebSocket-Version',
    'Sec-WebSocket-Extensions',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Same Site Stylesheet', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Same Site Script', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Same Site Image', null, false, true, [
    'Connection',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Same Site Preflight', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Same Site Xhr', 'fetch-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  checkResourceType('Same Site Xhr - Post', 'fetch-post-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  function checkResourceType(
    type: string,
    urlFilter: string = null,
    checkOrder = true,
    checkCase = false,
    defaultValues: string[],
  ) {
    try {
      const typeStats = browserStats[type];
      let requests = profile.cleanedEntries.filter(x => x.type === type);
      if (urlFilter) requests = requests.filter(x => x.path.includes(urlFilter));

      let failedReason = '';
      let omitted = false;
      if (!requests.length) {
        omitted = true;
        failedReason = 'Resource not requested';
      }
      if (!typeStats) {
        omitted = true;
        failedReason = 'No browser profile found matching user-agent';
      }
      if (failedReason) {
        results.push(
          {
            passed: false,
            omitted,
            resourceType: type,
            testName: 'Header Included',
            reason: failedReason,
          },
          {
            passed: false,
            omitted,
            resourceType: type,
            testName: 'Header Order',
            reason: failedReason,
          },
          {
            passed: false,
            omitted,
            resourceType: type,
            testName: 'Default Order',
            reason: failedReason,
          },
        );
        return;
      }

      const [request] = requests;
      if (checkOrder) {
        checkHeaderOrder(request, typeStats.defaultHeaderOrders[0]);
      } else if (checkCase) {
        checkHeaderCase(request, typeStats.defaultHeaderOrders[0]);
      }
      checkDefaultValues(request, typeStats.defaults, ...defaultValues);
    } catch (err) {
      console.log('Error for %s ---> ', [type, urlFilter].filter(Boolean).join('  '), err);
    }
  }

  function checkHeaderCase(item: ICleanedRequestInfo, expectedOrder: string) {
    const order = getDefaultHeaderOrder(item.headers);
    for (const key of order.defaultKeys) {
      results.push({
        passed: expectedOrder.includes(key),
        resourceType: item.type,
        testName: 'Header Included',
        value: key,
        expected: expectedOrder,
      });
    }
  }

  function checkHeaderOrder(item: ICleanedRequestInfo, expectedOrder: string) {
    const order = getDefaultHeaderOrder(item.headers);
    results.push({
      passed: expectedOrder !== order.defaultKeys.join(','),
      resourceType: item.type,
      testName: 'Header Order',
      value: order.defaultKeys.join(),
      expected: expectedOrder,
    });
  }

  function checkDefaultValues(
    item: { type: string; rawHeaders: string[] },
    defaults: { [header: string]: string[] },
    ...headers: string[]
  ) {
    for (const header of headers) {
      const value = item.rawHeaders
        .find(x => x.toLowerCase().startsWith(header.toLowerCase()))
        ?.split('=')
        .slice(1)
        .join('=');
      const defaultValues = defaults[header] ?? defaults[header.toLowerCase()];
      let passing = false;
      if (defaultValues && defaultValues.length) {
        passing = defaultValues.includes(value);
      } else {
        passing = !value;
      }

      results.push({
        passed: passing,
        resourceType: item.type,
        testName: 'Default header: ' + header,
        value,
        expected: defaultValues?.join(', '),
      });
    }
  }

  return results;
}

interface IDetectorResult {
  passed: boolean;
  resourceType: string;
  testName: string;
  omitted?: boolean;
  value?: string;
  expected?: string;
  reason?: string;
}
