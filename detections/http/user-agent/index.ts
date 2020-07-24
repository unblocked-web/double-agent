import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import Browsers from '@double-agent/profiler/lib/Browsers';
import Oses from '@double-agent/profiler/lib/Oses';
import { flaggedCheckFromRequest } from '@double-agent/runner/lib/flagUtils';
import UserBucket from '@double-agent/runner/interfaces/UserBucket';
import { createOsKeyFromUseragent } from '@double-agent/profiler/lib/OsUtils';
import { createBrowserKeyFromUseragent } from '@double-agent/profiler/lib/BrowserUtils';

export default class Plugin implements IDetectionPlugin {
  public async onRequest(ctx: IRequestContext) {
    // if no user agent, or agent changes across requests, this is definitely a bot
    const isFlaggedAgent =
      !ctx.requestDetails.useragent || ctx.requestDetails.useragent !== ctx.session.useragent;
    ctx.session.recordCheck(isFlaggedAgent, {
      ...flaggedCheckFromRequest(ctx, 'http', 'User Agent'),
      pctBot: 100,
      description: 'User agent was not consistent on every request in this session',
      checkName: 'User Agent Consistent',
      value: ctx.requestDetails.useragent,
      expected: ctx.session.useragent,
    });

    if (ctx.session.requests.length > 1) return;

    ctx.session.identifiers.push({
      layer: 'http',
      category: 'User Agent',
      bucket: UserBucket.Useragent,
      id: ctx.session.useragent,
    });

    const useragent = ctx.session.useragent;

    const browserKey = createBrowserKeyFromUseragent(useragent);
    const browserPct = new Browsers().getByKey(browserKey)?.desktopPercent ?? 0.1;

    const osKey = createOsKeyFromUseragent(useragent);
    const osPct = new Oses().getByKey(osKey)?.desktopPercent ?? 0.1;

    // 2% frequency means 2 in 100 requests, ie, 50% chance a single request is a bot
    // 1% frequency means 1 in 100, ie 100/1 = 100%
    // 0.5% means 0.5 in 100 = 200%?
    const browserBotPct = Math.min(Math.floor(100 / browserPct / 2), 50);
    const osBotPct = Math.min(Math.floor(100 / osPct / 2), 50);

    const baseCheck = flaggedCheckFromRequest(ctx, 'http', 'User Agent');
    ctx.session.recordCheck(browserBotPct > 0, {
      ...baseCheck,
      checkName: 'Browser Popularity',
      description: 'Checks that a User Agent is among the most popular "current" browsers',
      value: useragent,
      pctBot: browserBotPct,
    });
    ctx.session.recordCheck(osBotPct > 0, {
      ...baseCheck,
      checkName: 'Operating System Popularity',
      description: 'Checks that a User Agent is among the most popular "current" Operating Systems',
      value: useragent,
      pctBot: osBotPct,
    });
    ctx.session.pluginsRun.push(`http/useragent`);
  }
}
