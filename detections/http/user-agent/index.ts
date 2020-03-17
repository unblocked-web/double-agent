import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import getBrowsersToProfile, { osToAgentOs } from '@double-agent/profiler/lib/getBrowsersToProfile';
import { lookup } from 'useragent';
import { flaggedCheckFromRequest } from '@double-agent/runner/lib/flagUtils';
import UserBucket from '@double-agent/runner/interfaces/UserBucket';

const browserPopularity = getBrowsersToProfile(0.5, 0.5);

export default class Plugin implements IDetectionPlugin {
  public async onRequest(ctx: IRequestContext) {
    // if no user agent, or agent changes across requests, this is definitely a bot
    if (!ctx.requestDetails.useragent || ctx.requestDetails.useragent !== ctx.session.useragent) {
      ctx.session.flaggedChecks.push({
        ...flaggedCheckFromRequest(ctx, 'http', 'User Agent'),
        pctBot: 100,
        description: 'User agent was not consistent on every request in this session',
        checkName: 'User Agent Consistent',
        value: ctx.requestDetails.useragent,
        expected: ctx.session.useragent,
      });
    }

    if (ctx.session.requests.length > 1) return;

    ctx.session.identifiers.push({
      layer: 'http',
      bucket: UserBucket.Useragent,
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
          uaOs.family === parseUa.os.family &&
          uaOs.minor === parseUa.os.minor &&
          uaOs.major === parseUa.os.major
        );
      })?.averagePercent ?? 0.1;

    // 2% frequency means 2 in 100 requests, ie, 50% chance a single request is a bot
    // 1% frequency means 1 in 100, ie 100/1 = 100%
    // 0.5% means 0.5 in 100 = 200%?
    const browserBotPct = Math.min(Math.floor(100 / browserPct) / 2, 50);
    const osBotPct = Math.min(Math.floor(100 / osPct) / 2, 50);

    const baseCheck = flaggedCheckFromRequest(ctx, 'http', 'User Agent');
    if (browserBotPct > 0) {
      ctx.session.flaggedChecks.push({
        ...baseCheck,
        checkName: 'Browser Popularity',
        description: 'Checks that a User Agent is among the most popular "current" browsers',
        value: useragent,
        pctBot: browserPct,
      });
    }
    if (osBotPct > 0) {
      ctx.session.flaggedChecks.push({
        ...baseCheck,
        checkName: 'Operating System Popularity',
        description:
          'Checks that a User Agent is among the most popular "current" Operating Systems',
        value: useragent,
        pctBot: osBotPct,
      });
    }
    ctx.session.pluginsRun.push(`http/useragent`);
  }
}
