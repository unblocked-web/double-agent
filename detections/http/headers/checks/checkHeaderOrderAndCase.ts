import getDefaultHeaderOrder from '../lib/getDefaultHeaderOrder';
import { IHeadersRequest } from '../lib/HeaderProfile';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';
import { IHeaderStats } from '../lib/getBrowserProfileStats';
import DetectionSession from '@double-agent/runner/lib/DetectionSession';

export default function checkHeaderOrderAndCase(
  session: DetectionSession,
  check: Pick<
    IFlaggedCheck,
    | 'layer'
    | 'category'
    | 'requestIdx'
    | 'resourceType'
    | 'originType'
    | 'secureDomain'
    | 'description'
  >,
  checkCaseOnly: boolean,
  request: IHeadersRequest,
  browserStats: IHeaderStats,
) {
  const hasBrowserStats = !!browserStats;
  const expectedOrders = browserStats?.defaultHeaderOrders.map(x => x.split(',')) ?? [];
  const order = getDefaultHeaderOrder(request.headers);
  // remove cache entries
  const userHeaderNames = order.defaultKeys.filter(x => !cacheHeaders.includes(x));

  for (let index = 0; index < userHeaderNames.length; index += 1) {
    const headerName = userHeaderNames[index];
    const presentWithCorrectCase = expectedOrders.some(x => x.includes(headerName));
    let presentWithIncorrectCase: string;

    for (const order of expectedOrders) {
      presentWithIncorrectCase = order.find(y => y.toLowerCase() === headerName.toLowerCase());
      if (presentWithIncorrectCase) break;
    }

    let isIncorrectCase = presentWithIncorrectCase && !presentWithCorrectCase;

    // if casing is wrong, definitely a bot
    session.recordCheck(hasBrowserStats && isIncorrectCase, {
      ...check,
      checkName: `Header has Correct Capitalization: ${headerName}`,
      description: `Checks that headers sent by a user agent have the correct capitalized letters for the given user agent`,
      value: headerName,
      pctBot: 100,
      expected: presentWithIncorrectCase,
    });
  }

  if (checkCaseOnly === true) return;

  const hasOrderMatch = headersMatchAKnownOrder(
    userHeaderNames,
    browserStats?.defaultHeaderOrders ?? [],
  );
  session.recordCheck(hasBrowserStats && !hasOrderMatch, {
    ...check,
    pctBot: 85,
    checkName: `Headers in Correct Order`,
    description: `Checks if the request headers are in the correct order for the given user agent`,
    value: userHeaderNames.join(','),
    expected:
      browserStats && browserStats.defaultHeaderOrders?.length
        ? browserStats.defaultHeaderOrders[0]
        : '?',
  });
}

const cacheHeaders = ['Pragma', 'No-Cache'];

function headersMatchAKnownOrder(userHeaderNames: string[], defaultHeaderOrders: string[]) {
  const userHeaders = userHeaderNames.join(',');
  const userHeadersWithoutCookies = userHeaderNames
    .filter(x => x.toLowerCase() !== 'cookie')
    .join(',');

  for (const order of defaultHeaderOrders) {
    if (order === userHeaders) {
      return true;
    }
    const orderWithoutCookies = order
      .split(',')
      .filter(x => x.toLowerCase() !== 'cookie')
      .join(',');
    if (orderWithoutCookies === userHeadersWithoutCookies) {
      return true;
    }
  }
  return false;
}
