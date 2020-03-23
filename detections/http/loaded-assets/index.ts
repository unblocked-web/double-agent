import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';
import OriginType from '@double-agent/runner/interfaces/OriginType';

export default class LoadedAssetsPlugin implements IDetectionPlugin {
  public async afterRequestDetectorsRun(ctx: IRequestContext) {
    if (ctx.requestDetails.resourceType === ResourceType.Document) {
      for (const expectedLoad of ctx.session.expectedAssets) {
        // don't check current urls
        if (expectedLoad.fromUrl === ctx.requestDetails.url) continue;

        const hasLoad = ctx.session.requests.some(
          x =>
            x.resourceType === expectedLoad.resourceType &&
            x.hostDomain === expectedLoad.hostDomain &&
            x.secureDomain === expectedLoad.secureDomain,
        );
        if (!hasLoad) {
          if (
            !ctx.session.assetsNotLoaded.some(
              x =>
                x.resourceType === expectedLoad.resourceType &&
                x.originType === expectedLoad.originType &&
                x.secureDomain === expectedLoad.secureDomain &&
                x.hostDomain === expectedLoad.hostDomain,
            )
          ) {
            ctx.session.assetsNotLoaded.push(expectedLoad);
          }
        }
      }
    }
    // only check these on results pages
    if (ctx.url.pathname !== '/results-page') return;

    const isSecure = ctx.requestDetails.secureDomain;
    const key = isSecure ? 'https/assets-loaded' : 'http/assets-loaded';
    if (ctx.session.pluginsRun.includes(key)) return;
    ctx.session.pluginsRun.push(key);

    const excluded = ctx.session.assetsNotLoaded;
    if (!excluded.length) return;

    const xhrPreflightRequestsExpected = ctx.session.requests.filter(
      x =>
        x.resourceType === ResourceType.Xhr &&
        x.secureDomain === ctx.requestDetails.secureDomain &&
        x.originType !== OriginType.SameOrigin,
    ).length;
    const isXhrFlagged = xhrPreflightRequestsExpected === 0;

    const preflights = ctx.session.requests.filter(x => x.resourceType === ResourceType.Preflight)
      .length;
    ctx.session.recordCheck(isXhrFlagged, {
      pctBot: 100,
      layer: 'http',
      category: 'Loads All Page Assets',
      checkName: 'Performs Preflight Checks',
      description: `Checks that a user agent is loading Preflight requests before non Same Origin Xhr Requests`,
      secureDomain: ctx.requestDetails.secureDomain,
      resourceType: ResourceType.Preflight,
      value: preflights,
      expected: xhrPreflightRequestsExpected,
    });

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

  const flag = ctx.session.recordCheck(assetsNotLoaded > 0, {
    pctBot: assetsLoaded === 0 ? 99 : 75,
    layer: 'http',
    category: 'Loads All Page Assets',
    checkName: 'Loads ' + resourceType,
    description: `Checks that a user agent is loading ${resourceType}s (bots frequently don't load all css/images/etc)`,
    secureDomain: ctx.requestDetails.secureDomain,
    resourceType: resourceType,
    value: assetsLoaded,
    expected: returnValue.expectedAssets,
  });

  if (assetsNotLoaded > 0) {
    returnValue.flag = flag;
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
