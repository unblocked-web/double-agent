import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import IDetectionDomains from '@double-agent/runner/interfaces/IDetectionDomains';
import IdBucketTracker from '@double-agent/runner/lib/IdBucketTracker';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import UserBucket from '@double-agent/runner/interfaces/UserBucket';
import { flaggedCheckFromRequest, maxBotPctByCategory } from '@double-agent/runner/lib/flagUtils';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';

export default class HttpHitsPlugin implements IDetectionPlugin {
  public async start(
    domains: IDetectionDomains,
    secureDomains: IDetectionDomains,
    bucketTracker: IdBucketTracker,
  ) {
    bucketTracker.trackHitsByBucketGroup([UserBucket.IpAndPortRange, UserBucket.Useragent]);
    bucketTracker.trackResourceHits((url, request) => {
      if (request.resourceType === ResourceType.Document) {
        return 'page';
      }
    });
  }

  public async onRequest(ctx: IRequestContext) {
    const hitAllowances = [
      [1, 10, 'Hits Per Minute'],
      [10, 20, 'Hits Per 10 Minutes'], // 20 hits in 10 mins = 1 every 30 seconds
    ] as HitAllowance[];

    const checks = [
      { buckets: [UserBucket.IpAndPortRange], title: 'IP Address' },
      { buckets: [UserBucket.Browser], title: 'Browser Fingerprint' },
      {
        buckets: [UserBucket.IpAndPortRange, UserBucket.Useragent],
        title: 'IP Address/Port Range and Useragent',
        extras: '  Outbound requests will often follow a series of ports when from the same client',
      },
    ];

    for (const check of checks) {
      for (const [mins, allowedHits, name] of hitAllowances) {
        const documentHits = ctx.bucketTracker.getBucketHits(ctx, mins, check.buckets, 'page');

        // TODO: calculate ideal percents. these are semi-random swags
        const multiplier = Math.max(0, documentHits.hits - allowedHits);

        recordCategoryHits(name, ctx, documentHits, multiplier, {
          checkName: `Page ${name} from the Same ${check.title}`,
          description: `Multiplies the likelihood a request is a bot by the maximum seen with the same ${
            check.title
          }${check.extras ?? ''}`,
        });
      }
    }
  }
}

type HitAllowance = [number, number, string];

function recordCategoryHits(
  flagCategory: string,
  ctx: IRequestContext,
  hitsByBrowser: { botScoreByCategory: { [key: string]: { max: number } }; hits: number },
  multiplierPct: number,
  details: Pick<IFlaggedCheck, 'checkName' | 'description'>,
) {
  if (multiplierPct === 0) return;
  const maxPcts = maxBotPctByCategory(ctx);
  for (const [category, botPct] of maxPcts) {
    // can't go up from here :)
    if (botPct === 100) continue;
    const maxPct = hitsByBrowser.botScoreByCategory[category]?.max;
    if (maxPct) {
      const updatedFlag = maxPct + Math.floor((maxPct * multiplierPct) / 100);
      const pctBot = Math.min(99, updatedFlag);
      ctx.session.flaggedChecks.push({
        ...flaggedCheckFromRequest(ctx, 'visits', flagCategory),
        ...details,
        pctBot,
        value: hitsByBrowser.hits + ' Hits',
      });
    }
  }
}
