import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import IDetectionDomains from '@double-agent/runner/interfaces/IDetectionDomains';
import UserBucketTracker from '@double-agent/runner/lib/UserBucketTracker';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import UserBucket from '@double-agent/runner/interfaces/UserBucket';
import { flaggedCheckFromRequest, maxBotPctByCategory } from '@double-agent/runner/lib/flagUtils';
import IVisitLimit from './interfaces/IVisitLimit';
import bucketChecks from './lib/bucketChecks';
import visitLimits from './lib/visitLimits';

export default class VisitsOverTimePlugin implements IDetectionPlugin {
  public async start(
    domains: IDetectionDomains,
    secureDomains: IDetectionDomains,
    bucketTracker: UserBucketTracker,
  ) {
    bucketTracker.trackHitsByBucketGroup([UserBucket.IpAndPortRange, UserBucket.Useragent]);
    bucketTracker.trackResourceHits((url, request) => {
      if (request.resourceType === ResourceType.Document) {
        return 'page';
      }
    });
  }

  public async onRequest(ctx: IRequestContext) {
    // just check on document requests
    if (ctx.requestDetails.resourceType !== ResourceType.Document) return;

    for (const check of bucketChecks) {
      for (const { minutes, limits, periodName } of visitLimits) {
        const documentHits = ctx.bucketTracker.getBucketHits(ctx, minutes, check.buckets, 'page');
        const maxBotPctsForBucket = maxBotPctByCategory(ctx).map(
          ([category]) => documentHits.botScoreByCategory[category]?.max ?? 0,
        );
        const threshold = limits.find(x => documentHits.hits > x.visits);
        let { isFlagged, pctBot } = VisitsOverTimePlugin.getBotPct(threshold, maxBotPctsForBucket);

        ctx.session.recordCheck(isFlagged, {
          ...flaggedCheckFromRequest(ctx, 'visits', periodName),

          checkName: `Page ${periodName} from the Same ${check.title}`,
          description: `Multiplies the likelihood a request is a bot by the maximum seen with the same ${
            check.title
          }${check.extras ?? ''}`,
          pctBot,
          value: documentHits.hits + ' Hits',
        });
      }
    }
  }

  private static getBotPct(threshold: IVisitLimit, maxBotPctsForBucket: number[]) {
    let isFlagged = threshold.categoryMultiplier === 0;
    let maxBucketPct = threshold.pctBot;

    for (const maxPct of maxBotPctsForBucket) {
      const botPctWithMultiplier = Math.floor(
        (maxPct * (100 + threshold.categoryMultiplier)) / 100,
      );
      if (botPctWithMultiplier > maxBucketPct) maxBucketPct = botPctWithMultiplier;
    }

    const pctBot = Math.min(100, maxBucketPct);
    return { isFlagged, pctBot };
  }
}
