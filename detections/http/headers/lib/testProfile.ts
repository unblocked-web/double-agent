import { IHeaderStats } from './getBrowserProfileStats';
import getDefaultHeaderOrder from './getDefaultHeaderOrder';
import Profile, { ICleanedRequestInfo } from './Profile';

export default function testProfile(
  profile: Profile,
  browserStats: { [type: string]: IHeaderStats },
) {
  const results: IDetectorResult[] = [];

  const httpName = profile.domains.isSsl ? 'Https' : 'Http';

  const headerDefaultsToCheck = [
    'Connection',
    'Accept',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Accept-Encoding',
    'Accept-Language', // Chrome headless will send en-US, while headfull will send en-US,en;q=0.9 or en-US,en;q=0.9,und;q=0.8
  ];

  checkResourceType(`Standard ${httpName} Headers`, 'Document', null, true, false, [
    'Upgrade-Insecure-Requests',
    'Sec-Fetch-User',
    ...headerDefaultsToCheck,
  ]);

  for (const domain of ['', 'Cross Domain ', 'Same Site ']) {
    checkResourceType('Websocket Headers', domain + 'Websocket - Upgrade', null, true, false, [
      'Upgrade',
      'Sec-WebSocket-Version',
      'Sec-WebSocket-Extensions',
      ...headerDefaultsToCheck,
    ]);

    checkResourceType(
      'Asset Headers',
      domain + 'Stylesheet',
      null,
      true,
      false,
      headerDefaultsToCheck,
    );
    checkResourceType('Asset Headers', domain + 'Script', null, true, false, headerDefaultsToCheck);
    checkResourceType('Asset Headers', domain + 'Image', null, false, true, headerDefaultsToCheck);

    if (!domain) {
      checkResourceType(
        'Xhr Headers',
        domain + 'Xhr',
        'axios-noheaders',
        false,
        true,
        headerDefaultsToCheck,
      );
    }

    checkResourceType(
      'Xhr Headers',
      domain + 'Xhr',
      'fetch-noheaders',
      false,
      true,
      headerDefaultsToCheck,
    );

    checkResourceType(
      'Xhr Headers',
      domain + 'Xhr - Post',
      'fetch-post-noheaders',
      false,
      true,
      headerDefaultsToCheck,
    );

    if (domain) {
      checkResourceType(
        'Cors Preflight Headers',
        domain + 'Preflight',
        null,
        true,
        false,
        headerDefaultsToCheck,
      );
    }
  }

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
    console.log('Checking default values for headers', headers, item, defaults);
    for (const header of headers) {
      const value = item.rawHeaders
        .find(x => x.toLowerCase().startsWith(header.toLowerCase() + '='))
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
