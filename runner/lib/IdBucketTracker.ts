import IRequestContext from '../interfaces/IRequestContext';
import IUserIdentifier from '../interfaces/IUserIdentifier';
import IDetectionSession from '../interfaces/IDetectionSession';
import UserBucket from '../interfaces/UserBucket';
import IRequestDetails from '../interfaces/IRequestDetails';
import IDetectorModule from '../interfaces/IDetectorModule';
import HitTracker from './HitTracker';

export default class IdBucketTracker {
  private combinedIdTrackers: UserBucket[][] = [];
  private resourceTrackers: ((url: URL, request: IRequestDetails) => string | null)[] = [() => '*'];

  private readonly botCheckCategories: string[] = [];
  private tracker: { [id: string]: HitTracker } = {};

  constructor(detectors: IDetectorModule[]) {
    for (const detector of detectors) {
      this.botCheckCategories.push(...detector.checkCategories);
    }
  }

  public trackResourceHits(tracker: (url: URL, request: IRequestDetails) => string | null) {
    this.resourceTrackers.push(tracker);
  }

  public trackHitsByBucketGroup(buckets: UserBucket[]) {
    if (
      !this.combinedIdTrackers.some(
        x => x.length === buckets.length && x.every(y => buckets.includes(y)),
      )
    ) {
      this.combinedIdTrackers.push(buckets);
    }
  }

  public getBucketHits(
    ctx: IRequestContext,
    lastMinutes: number,
    buckets: UserBucket[],
    resourceKey = '*',
  ) {
    const fullKey = IdBucketTracker.getOmnibusKey(buckets, ctx.session, resourceKey);
    const hitTracker = this.tracker[fullKey];
    const startTime = ctx.requestDetails.time.subtract(lastMinutes, 'minutes');

    return hitTracker.getSince(startTime);
  }

  public recordRequest(ctx: IRequestContext) {
    const tracked = new Set<string>();
    for (const resourceTracker of this.resourceTrackers) {
      // see if this resource should be tracked
      const resourceKey = resourceTracker(ctx.url, ctx.requestDetails);
      if (!resourceKey) continue;

      for (const id of ctx.session.identifiers) {
        const key = IdBucketTracker.createKey(id, resourceKey);
        this.increment(ctx, key, tracked);
      }
      for (const buckets of this.combinedIdTrackers) {
        const fullKey = IdBucketTracker.getOmnibusKey(buckets, ctx.session, resourceKey);

        if (fullKey) {
          this.increment(ctx, fullKey, tracked);
        }
      }
    }
  }

  private increment(ctx: IRequestContext, key: string, alreadyTracked: Set<string>) {
    if (alreadyTracked.has(key)) return;
    alreadyTracked.add(key);

    const tracker = this.tracker[key] ?? new HitTracker(this.botCheckCategories);
    if (!this.tracker[key]) this.tracker[key] = tracker;
    tracker.increment(ctx);
  }

  private static getOmnibusKey(
    buckets: UserBucket[],
    session: IDetectionSession,
    resourceKey: string,
  ) {
    const keyParts = [];
    for (const bucket of buckets) {
      const otherId = session.identifiers.find(x => x.bucket === bucket);
      if (!otherId) return null;
      const key = IdBucketTracker.createKey(otherId, resourceKey);
      if (!keyParts.includes(key)) keyParts.push(key);
    }
    return keyParts.join(', ');
  }

  private static createKey(id: IUserIdentifier, resourceKey: string) {
    return `${id.bucket}: ${id.id} -> ${resourceKey}`;
  }
}
