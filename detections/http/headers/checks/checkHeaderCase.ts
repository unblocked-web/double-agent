import getDefaultHeaderOrder from '../lib/getDefaultHeaderOrder';
import IDetectionSession from '@double-agent/runner/interfaces/IDetectionSession';
import { IHeadersRequest } from '../lib/HeaderProfile';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';

export default function checkHeaderCase(
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
  request: IHeadersRequest,
  expectedOrder: string,
) {
  const order = getDefaultHeaderOrder(request.headers);
  for (const key of order.defaultKeys) {
    if (!expectedOrder.includes(key)) {
      // some occasions where order can vary, but very likely a bot
      let pctBot = 99;
      if (expectedOrder.toLowerCase().includes(key)) pctBot = 100;
      // if casing is wrong, definitely a bot
      session.flaggedChecks.push({
        ...check,
        checkName: 'Header Has Expected Letter Casing',
        description: `Checks if the request has a header value for ${key} matching the default case sent for this user agent (and presuming that it is included in the headers).${check.description ??
          ''}`,
        value: key,
        pctBot,
        expected: expectedOrder,
      });
    }
  }
}
