import IRequestContext from '../interfaces/IRequestContext';
import Layer from '../interfaces/Layer';
import { getHostType, getResourceType } from '../server/extractRequestDetails';
import IAsset from '../interfaces/IAsset';
import OriginType from '../interfaces/OriginType';
import IDomainset from '../interfaces/IDomainset';
import ResourceType from '../interfaces/ResourceType';
import IFlaggedCheck from '../interfaces/IFlaggedCheck';

export function flaggedCheckFromRequest(ctx: IRequestContext, layer: Layer, category: string) {
  const request = ctx.requestDetails;
  const requestIdx = ctx.session.requests.indexOf(request);
  return {
    category,
    layer,
    resourceType: request.resourceType,
    originType: request.originType,
    hostDomain: request.hostDomain,
    secureDomain: request.secureDomain,
    requestIdx,
  } as Pick<
    IFlaggedCheck,
    | 'category'
    | 'resourceType'
    | 'originType'
    | 'hostDomain'
    | 'secureDomain'
    | 'requestIdx'
    | 'layer'
  >;
}

export function assetFromURL(url: URL, originType: OriginType, domains: IDomainset) {
  const hostDomain = getHostType(url, domains);
  const asset: IAsset = {
    pathname: url.pathname,
    secureDomain: url.protocol === 'https:' || url.protocol === 'wss:',
    hostDomain,
    layer: 'http',
    originType,
    resourceType: url.protocol.startsWith('ws')
      ? ResourceType.WebsocketUpgrade
      : getResourceType('', url.pathname),
  };
  return asset;
}

export function maxBotPctByCategory(ctx: IRequestContext) {
  const maxPctBotPerCategory: { [category: string]: number } = {};
  for (const { category, pctBot } of ctx.session.flaggedChecks) {
    maxPctBotPerCategory[category] = Math.max(maxPctBotPerCategory[category] ?? pctBot, pctBot);
  }
  return Object.entries(maxPctBotPerCategory);
}
