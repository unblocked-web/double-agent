import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';

export default class LoadedAssetsPlugin implements IDetectionPlugin {
  public async onRequest(ctx: IRequestContext) {
    // only check these on results pages
    if (ctx.url.pathname !== '/results') return;

    const excluded = ctx.session.assetsNotLoaded;
    if (!excluded.length) return;

    const { expectedAssets } = areAllAssetsLoaded(ctx, ResourceType.WebsocketUpgrade);

    const websocketMessageResult = areAllAssetsLoaded(
      ctx,
      ResourceType.WebsocketMessage,
      expectedAssets,
    );
    if (websocketMessageResult.flag) {
      Object.assign(websocketMessageResult.flag, {
        checkName: 'Sends Webservice Requests',
        description:
          "Checks that a user agent sends webservice messages (bots frequently don't load all css/images/etc)",
      });
    }

    areAllAssetsLoaded(ctx, ResourceType.Stylesheet);
    const imageResult = areAllAssetsLoaded(ctx, ResourceType.Image);
    if (imageResult.flag) {
      // if only a few images, this isn't necessarily a bot
      if (Number(imageResult.flag.expected) - Number(imageResult.flag.value) <= 2) {
        imageResult.flag.pctBot = 10;
      }
    }
  }
}

function areAllAssetsLoaded(
  ctx: IRequestContext,
  resourceType: ResourceType,
  expectedLoads?: number,
) {
  const assetsNotLoaded = countAssetsNotLoaded(ctx, resourceType);
  const assetsLoaded = expectedLoads ?? countRequestsMade(ctx, resourceType);
  const returnValue: { expectedAssets: number; flag?: IFlaggedCheck } = {
    expectedAssets: assetsNotLoaded + assetsLoaded,
  };
  if (assetsNotLoaded) {
    returnValue.flag = {
      pctBot: assetsLoaded === 0 ? 99 : 75,
      layer: 'http',
      category: 'Loads All Page Assets',
      checkName: 'Loads ' + ResourceType[resourceType],
      description: `Checks that a user agent is loading ${ResourceType[resourceType]}s (bots frequently don't load all css/images/etc)`,
      secureDomain: ctx.requestDetails.secureDomain,
      resourceType: resourceType,
      value: assetsLoaded,
      expected: returnValue.expectedAssets,
    };
    ctx.session.flaggedChecks.push(returnValue.flag);
  }
  return returnValue;
}

function countAssetsNotLoaded(ctx: IRequestContext, resourceType: ResourceType) {
  const isSecure = ctx.requestDetails.secureDomain;
  return ctx.session.assetsNotLoaded.filter(
    x => x.resourceType === resourceType && x.secureDomain === isSecure,
  ).length;
}

function countRequestsMade(ctx: IRequestContext, resourceType: ResourceType) {
  const isSecure = ctx.requestDetails.secureDomain;
  return ctx.session.requests.filter(
    x => x.resourceType === resourceType && x.secureDomain === isSecure,
  ).length;
}
