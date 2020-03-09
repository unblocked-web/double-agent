import HeaderProfile from '../lib/HeaderProfile';
import { getStatsKey, IHeaderStats } from '../lib/getBrowserProfileStats';
import checkHeaderOrder from './checkHeaderOrder';
import checkHeaderCase from './checkHeaderCase';
import checkDefaultValues from './checkDefaultValues';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import IAsset from '@double-agent/runner/interfaces/IAsset';
import OriginType from '@double-agent/runner/interfaces/OriginType';

export default function runChecks(
  profile: HeaderProfile,
  browserStats: { [type: string]: IHeaderStats },
  checks: IResourceCheck[],
) {
  const session = profile.session;
  for (const check of checks) {
    const { checkHeaderCaseOnly, extraBrowserDefaultHeaders } = check;

    try {
      const key = getStatsKey(
        check.secureDomain,
        check.originType,
        check.resourceType,
        check.httpMethod,
      );
      const browserResourceStats = browserStats[key];

      if (!browserResourceStats) {
        // don't have browser stats. Can't do anything
        return;
      }

      const asset: IAsset = {
        secureDomain: check.secureDomain,
        layer: 'http',
        resourceType: check.resourceType,
        originType: check.originType,
      };

      let requests = profile.requests.filter(
        x =>
          x.resourceType?.toString() === check.resourceType?.toString() &&
          x.originType?.toString() === check.originType?.toString() &&
          x.secureDomain === check.secureDomain &&
          x.method === (check.httpMethod ?? 'GET'),
      );
      if (check.urlFilter) requests = requests.filter(x => x.url.includes(check.urlFilter));
      if (check.refererFilter) requests = requests.filter(x => x.url.includes(check.refererFilter));

      if (!requests.length) {
        session.assetsNotLoaded.push(asset);
        console.log('Check not found', check);
        continue;
      }

      const [request] = requests;

      const precheck = {
        ...asset,
        category: check.category,
        requestIdx: request.requestIdx,
        description: check.descriptionExtra,
      };
      if (checkHeaderCaseOnly) {
        checkHeaderCase(session, precheck, request, browserResourceStats.defaultHeaderOrders[0]);
      } else {
        checkHeaderOrder(session, precheck, request, browserResourceStats.defaultHeaderOrders[0]);
      }
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
        [check.originType, check.resourceType, check.urlFilter].filter(Boolean).join('  '),
        err,
      );
    }
  }
}

export interface IResourceCheck {
  resourceType: ResourceType;
  urlFilter?: string;
  refererFilter?: string;
  originType: OriginType;
  httpMethod?: string;
  secureDomain: boolean;
  category: string;
  extraBrowserDefaultHeaders?: string[];
  checkHeaderCaseOnly?: boolean;
  descriptionExtra?: string;
}
