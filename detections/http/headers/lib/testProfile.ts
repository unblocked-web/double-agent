import { IHeaderStats } from './getBrowserProfileStats';
import getDefaultHeaderOrder from './getDefaultHeaderOrder';
import Profile, { ICleanedRequestInfo } from './Profile';

export default function testProfile(
  profile: Profile,
  browserStats: { [type: string]: IHeaderStats },
) {
  const results: IDetectorResult[] = [];

  const httpName = profile.domains.isSsl ? 'Https' : 'Http';
  /**
   * Rules not yet tested for different use cases:
   * TODO:
   *  Cache-Control: sent on second request
   *  Sec-Fetch-User - will only show up user performed an activity to get to this page
   */
  checkResourceType(`Standard ${httpName} Headers`, 'Document', null, true, false, [
    'Connection',
    'Upgrade-Insecure-Requests',
    'Sec-Fetch-User',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Websocket Headers', 'Websocket - Upgrade', null, true, false, [
    'Connection',
    'Upgrade',
    'Sec-WebSocket-Version',
    'Sec-WebSocket-Extensions',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Asset Headers', 'Stylesheet', null, true, false, [
    'Connection',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Asset Headers', 'Script', null, true, false, [
    'Connection',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Asset Headers', 'Image', null, false, true, [
    'Connection',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Xhr Headers', 'Xhr', 'mainSite/axios-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  checkResourceType('Xhr Headers', 'Xhr', 'mainSite/fetch-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  checkResourceType('Xhr Headers', 'Xhr - Post', 'mainSite/fetch-post-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  /////// CROSS SITE //////

  checkResourceType('Cross Domain Headers', 'Cross Domain Websocket - Upgrade', null, true, false, [
    'Connection',
    'Upgrade',
    'Sec-WebSocket-Version',
    'Sec-WebSocket-Extensions',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Cross Domain Headers', 'Cross Domain Stylesheet', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Cross Domain Headers', 'Cross Domain Image', null, false, true, [
    'Connection',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Cross Domain Headers', 'Cross Domain Script', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Cross Domain Headers', 'Cross Domain Preflight', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Cross Domain Headers', 'Cross Domain Xhr', 'fetch-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  checkResourceType(
    'Cross Domain Headers',
    'Cross Domain Xhr - Post',
    'fetch-post-noheaders',
    false,
    true,
    [
      'Connection',
      'Accept',
      'Accept-Encoding',
      'Accept-Language',
      'Sec-Fetch-Site',
      'Sec-Fetch-Mode',
    ],
  );

  /////// SAME SITE //////

  checkResourceType('Same Site Headers', 'Same Site Websocket - Upgrade', null, true, false, [
    'Connection',
    'Upgrade',
    'Sec-WebSocket-Version',
    'Sec-WebSocket-Extensions',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Same Site Headers', 'Same Site Stylesheet', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Same Site Headers', 'Same Site Script', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Same Site Headers', 'Same Site Image', null, false, true, [
    'Connection',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Same Site Headers', 'Same Site Preflight', null, true, false, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
  ]);

  checkResourceType('Same Site Headers', 'Same Site Xhr', 'fetch-noheaders', false, true, [
    'Connection',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
  ]);

  checkResourceType(
    'Same Site Headers',
    'Same Site Xhr - Post',
    'fetch-post-noheaders',
    false,
    true,
    [
      'Connection',
      'Accept',
      'Accept-Encoding',
      'Accept-Language',
      'Sec-Fetch-Site',
      'Sec-Fetch-Mode',
    ],
  );

  function checkResourceType(
    category: string,
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

      for (const request of requests) {
        results.push({
          category,
          passed: request.sameAgent,
          resourceType: type,
          testName: 'User Agent Consistent',
          value: request.rawHeaders
            .find(x => x.toLowerCase().startsWith('user-agent'))
            ?.split('=')
            .slice(1)
            .join('='),
        });
      }

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
            category,
            passed: false,
            omitted,
            resourceType: type,
            testName: 'Header Included + Casing',
            reason: failedReason,
          },
          {
            category,
            passed: false,
            omitted,
            resourceType: type,
            testName: 'Default Headers in Order + Casing',
            reason: failedReason,
          },
          {
            category,
            passed: false,
            omitted,
            resourceType: type,
            testName: 'Header has a Browser Default Value',
            reason: failedReason,
          },
        );
        return;
      }

      const [request] = requests;
      if (checkOrder) {
        checkHeaderOrder(category, request, typeStats.defaultHeaderOrders[0]);
      } else if (checkCase) {
        checkHeaderCase(category, request, typeStats.defaultHeaderOrders[0]);
      }
      checkDefaultValues(category, request, typeStats.defaults, ...defaultValues);
    } catch (err) {
      console.log('Error for %s ---> ', [type, urlFilter].filter(Boolean).join('  '), err);
    }
  }

  function checkHeaderCase(category: string, item: ICleanedRequestInfo, expectedOrder: string) {
    const order = getDefaultHeaderOrder(item.headers);
    for (const key of order.defaultKeys) {
      results.push({
        category,
        passed: expectedOrder.includes(key),
        resourceType: item.type,
        testName: 'Header Included + Casing',
        value: key,
        expected: expectedOrder,
      });
    }
  }

  function checkHeaderOrder(category: string, item: ICleanedRequestInfo, expectedOrder: string) {
    const order = getDefaultHeaderOrder(item.headers);
    results.push({
      category,
      passed: expectedOrder === order.defaultKeys.join(','),
      resourceType: item.type,
      testName: 'Default Headers in Order + Casing',
      value: order.defaultKeys.join(),
      expected: expectedOrder,
    });
  }

  function checkDefaultValues(
    category: string,
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
        category,
        passed: passing,
        resourceType: item.type,
        testName: 'Header has a Browser Default Value for: ' + header,
        value,
        expected: defaultValues?.join(', '),
      });
    }
  }

  return results;
}

interface IDetectorResult {
  passed: boolean;
  category: string;
  resourceType: string;
  testName: string;
  omitted?: boolean;
  value?: string;
  expected?: string;
  reason?: string;
}
