import getDefaultHeaderOrder from '../lib/getDefaultHeaderOrder';
import IDetectionSession from '@double-agent/runner/interfaces/IDetectionSession';
import { IHeadersRequest } from '../lib/HeaderProfile';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';

const cacheHeaders = ['Pragma', 'No-Cache'];
export default function checkHeaderOrder(
  session: IDetectionSession,
  check: Pick<
    IFlaggedCheck,
    'layer' | 'category' | 'requestIdx' | 'resourceType' | 'originType' | 'secureDomain'
  >,
  request: IHeadersRequest,
  expectedOrder: string,
) {
  const requestOrder = getDefaultHeaderOrder(request.headers).defaultKeys;
  if (expectedOrder !== requestOrder.join(',')) {
    const expectedOrderNames = expectedOrder.split(',');
    // some occasions where order can vary, but very likely a bot
    let pctBot = 99;
    // if due to caching headers, less risk
    if (
      requestOrder.join(',') === expectedOrderNames.filter(x => !cacheHeaders.includes(x)).join(',')
    ) {
      pctBot = 25;
    }

    session.flaggedChecks.push({
      ...check,
      checkName: 'Headers are in the Correct Order and Case',
      description: `Checks if the request has all headers for this type of request in the correct order and case for the provided user agent`,
      value: requestOrder.join(),
      pctBot,
      expected: expectedOrder,
    });
  }
}
