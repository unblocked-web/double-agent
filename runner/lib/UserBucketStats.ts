import IDirective from '../interfaces/IDirective';
import IDetectionSession from '../interfaces/IDetectionSession';
import { getUseragentPath } from './profileHelper';
import { average } from './utils';
import IUserBucketAverages from '../interfaces/IUserBucketAverages';

export default class UserBucketStats {
  private samples = 0;
  private buckets: IUserBucketStats = {};

  public trackDirectiveResults(
    directive: Pick<IDirective, 'useragent'>,
    session: Pick<IDetectionSession, 'identifiers'>,
  ) {
    this.samples += 1;
    const browser = getUseragentPath(directive.useragent);
    for (const id of session.identifiers) {
      let tracker = this.buckets[id.bucket.toString()];
      if (!tracker) {
        tracker = [];
        this.buckets[id.bucket.toString()] = [];
      }
      const matchingId = tracker.find(x => x.id === id.id);
      if (matchingId) {
        matchingId.seenCount += 1;
        if (!matchingId.browsers.includes(browser)) {
          matchingId.browsers.push(browser);
        }
      } else {
        tracker.push({
          id: id.id,
          category: id.category,
          seenCount: 1,
          browsers: [browser],
        });
      }
    }
  }

  public toJSON() {
    const results: IUserBucketAverages = {};
    for (const [bucket, list] of Object.entries(this.buckets)) {
      if (!list.length) continue;
      // subtract 1 from seen count to get reuses
      const totalSeen = list.reduce((a, b) => a + b.seenCount, 0);
      const reusePcts = list.map(x => Math.ceil((100 * (x.seenCount - 1)) / totalSeen));
      results[bucket] = {
        values: list.length,
        category: list[0].category,
        avgReusePct: average(reusePcts),
        maxReusePct: Math.max(...reusePcts),
      };
    }
    return results;
  }
}

interface IUserBucketStats {
  [bucket: string]: { id: string; category: string; seenCount: number; browsers: string[] }[];
}
