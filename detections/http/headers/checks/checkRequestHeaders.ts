import { getStatsKey, IHeaderStats } from '../lib/getBrowserProfileStats';
import checkHeaderOrderAndCase from './checkHeaderOrderAndCase';
import checkDefaultValues from './checkDefaultValues';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import HeaderProfile from '../lib/HeaderProfile';
import { flaggedCheckFromRequest } from '@double-agent/runner/lib/flagUtils';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';

export default function checkRequestHeaders(
  ctx: IRequestContext,
  browserStats: { [type: string]: IHeaderStats },
  category: string,
  checkHeaderCaseOnly: boolean = false,
  extraBrowserDefaultHeaders?: string[],
  descriptionExtra?: string,
) {
  const session = ctx.session;

  try {
    const key = getStatsKey(
      ctx.requestDetails.secureDomain,
      ctx.requestDetails.originType,
      ctx.requestDetails.resourceType,
      ctx.requestDetails.method,
    );
    const browserResourceStats = browserStats[key];

    if (!browserResourceStats) {
      // don't have browser stats
      return;
    }

    const request = HeaderProfile.processRequestDetails(ctx.requestDetails, ctx.session);

    const precheck = flaggedCheckFromRequest(ctx, 'http', category);

    if (descriptionExtra) {
      (precheck as IFlaggedCheck).description = descriptionExtra;
    }

    checkHeaderOrderAndCase(
      session,
      precheck,
      checkHeaderCaseOnly,
      request,
      browserResourceStats,
    );

    checkDefaultValues({
      session,
      precheck,
      request,
      browserStats: browserResourceStats,
      extraHeaders: extraBrowserDefaultHeaders,
    });
  } catch (err) {
    console.log(
      'Error for %s ---> ',
      [ctx.requestDetails.originType, ctx.requestDetails.resourceType].filter(Boolean).join('  '),
      err,
    );
  }
}
