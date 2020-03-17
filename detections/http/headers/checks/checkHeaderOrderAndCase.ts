import getDefaultHeaderOrder from '../lib/getDefaultHeaderOrder';
import IDetectionSession from '@double-agent/runner/interfaces/IDetectionSession';
import { IHeadersRequest } from '../lib/HeaderProfile';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';
import { IHeaderStats } from '../lib/getBrowserProfileStats';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import { isAgent } from '@double-agent/runner/lib/userAgentUtils';

export default function checkHeaderOrderAndCase(
  session: IDetectionSession,
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
  const expectedOrders = browserStats.defaultHeaderOrders.map(x => x.split(','));
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

    if (!presentWithCorrectCase && !presentWithIncorrectCase) {
      // should not have been in the list
      let pctBot = 90;
      // some weirdness with Chrome 80 and preflight sec headers
      if (
        headerName.startsWith('Sec-') &&
        check.resourceType === ResourceType.Preflight &&
        isAgent(session.parsedUseragent, 'Chrome', 80)
      ) {
        pctBot = 10;
      }
      session.flaggedChecks.push({
        ...check,
        checkName: `Header Should be Included: ${headerName}`,
        description: `Checks that only expected headers are sent by a user agent`,
        value: 'Included',
        pctBot,
        expected: "Shouldn't be Included",
      });
    } else if (presentWithIncorrectCase && !presentWithCorrectCase) {
      // if casing is wrong, definitely a bot
      session.flaggedChecks.push({
        ...check,
        checkName: `Header has Correct Capitalization: ${headerName}`,
        description: `Checks that headers sent by a user agent have the correct capitalized letters for the given user agent`,
        value: headerName,
        pctBot: 100,
        expected: presentWithIncorrectCase,
      });
    }
  }

  if (checkCaseOnly === true) return;

  const hasOrderMatch = headersMatchAKnownOrder(userHeaderNames, browserStats.defaultHeaderOrders);
  if (!hasOrderMatch) {
    // see if difference is just cookies
    session.flaggedChecks.push({
      ...check,
      pctBot: 85,
      checkName: `Headers in Correct Order`,
      description: `Checks if the request headers are in the correct order for the given user agent`,
      value: userHeaderNames.join(','),
      expected: browserStats.defaultHeaderOrders.join(','),
    });
  }
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
