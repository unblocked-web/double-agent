import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import getBrowsersToProfile, { osToAgentOs } from '@double-agent/profiler/lib/getBrowsersToProfile';
import { lookup } from 'useragent';

const browserPopularity = getBrowsersToProfile(0.5, 0.5);

export default class Plugin implements IDetectionPlugin {
  public async onRequest(ctx: IRequestContext) {
    // if no user agent, or agent changes across requests, this is definitely a bot
    if (!ctx.requestDetails.useragent || ctx.requestDetails.useragent !== ctx.session.useragent) {
      ctx.session.flaggedChecks.push({
        secureDomain: ctx.requestDetails.secureDomain,
        requestIdx: ctx.session.requests.indexOf(ctx.requestDetails),
        pctBot: 100,
        category: 'User Agent',
        layer: 'http',
        description: 'User agent was not consistent on every request in this session',
        resourceType: ctx.requestDetails.resourceType,
        originType: ctx.requestDetails.originType,
        hostDomain: ctx.requestDetails.hostDomain,
        checkName: 'User Agent Consistent',
        value: ctx.requestDetails.useragent,
        expected: ctx.session.useragent,
      });
    }

    if (ctx.session.requests.length > 1) return;

    ctx.session.identifiers.push({
      layer: 'http',
      name: 'Useragent',
      id: ctx.session.useragent,
      raw: null,
    });

    const useragent = ctx.session.useragent;
    const parseUa = lookup(useragent);
    const { browsers, os } = await browserPopularity;

    const browserPct =
      browsers.find(
        x => x.browser === parseUa.family && x.version.split('.').shift() === parseUa.major,
      )?.averagePercent ?? 0.1;
    const osPct =
      os.find(x => {
        const uaOs = osToAgentOs(x);
        return (
          uaOs.family === parseUa.family &&
          uaOs.minor === parseUa.minor &&
          uaOs.major === parseUa.major
        );
      })?.averagePercent ?? 0.1;

    let pctBot = 0;
    // 2% frequency means 2 in 100 requests, ie, 50% chance a single request is a bot
    // 1% frequency means 1 in 100, ie 100/1 = 100%
    // 0.5% means 0.5 in 100 = 200%?
    pctBot += Math.min(Math.floor(100 / browserPct) / 2, 25);
    pctBot += Math.min(Math.floor(100 / osPct) / 2, 25);

    ctx.session.flaggedChecks.push({
      secureDomain: ctx.requestDetails.secureDomain,
      requestIdx: 0,
      category: 'User Agent',
      layer: 'http',
      resourceType: ctx.requestDetails.resourceType,
      originType: ctx.requestDetails.originType,
      hostDomain: ctx.requestDetails.hostDomain,
      checkName: 'User Agent Popularity',
      description: 'Checks that a User Agent is among the most popular "current" browsers',
      value: useragent,
      pctBot,
    });
    ctx.session.pluginsRun.push(`http/useragent`);
  }
}
