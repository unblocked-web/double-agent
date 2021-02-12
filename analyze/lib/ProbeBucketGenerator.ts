import ProbeBucket from './ProbeBucket';
import Probe from './Probe';
import Layer from './Layer';
import { BaseMatcher } from './matchers';
import { BaseScorer } from './scorers';
import BaseCheck, { ICheckType } from './checks/BaseCheck';
import extractBrowserGroupings from './extractBrowserGroupings';

export default class ProbeBucketGenerator {
  public readonly layer: Layer;
  public readonly probeBuckets: any[] = [];
  public probeCount = 0;
  public probeBucketCount = 0;

  public bucketedCheckCount = 0;
  public bucketedProbeCount = 0;

  private readonly meta: IProbeBucketMeta;

  constructor(pluginId: string, meta: IProbeBucketMeta) {
    this.meta = meta;

    const layerKey = Layer.extractKeyFromProbeMeta(meta);
    this.layer = Layer.create(layerKey, meta.layerName, pluginId);

    // convert checks array to object by id
    const universalCheckIds: Set<string> = new Set();
    const userAgentIdsByCheckId: { [path: string]: Set<string> } = {};
    const probesByCheckId: { [id: string]: Probe } = {};
    for (const check of meta.checks) {
      const checkId = check.id;
      probesByCheckId[checkId] = probesByCheckId[checkId] || Probe.create(check, pluginId);
      if (check.identity.userAgentId) {
        userAgentIdsByCheckId[checkId] = userAgentIdsByCheckId[checkId] || new Set();
        userAgentIdsByCheckId[checkId].add(check.identity.userAgentId);
      } else if (check.identity.isUniversal) {
        universalCheckIds.add(checkId);
      } else {
        throw new Error(`Check is missing userAgentId and is not universal: ${check.id}`);
      }
    }

    // organize initial groups
    const groupsById: {
      [groupId: string]: { userAgentIds: string[]; checkType: ICheckType; checkIds: string[] };
    } = {};
    for (const checkId of Object.keys(userAgentIdsByCheckId)) {
      const probe = probesByCheckId[checkId];
      const checkType = probe.check.type;
      const userAgentIds = Array.from(userAgentIdsByCheckId[checkId]).sort();
      const groupId = `${checkType}:${userAgentIds.join(':')}`;
      groupsById[groupId] = groupsById[groupId] || { userAgentIds, checkType, checkIds: [] };
      groupsById[groupId].checkIds.push(checkId);
    }

    if (universalCheckIds.size) {
      const universalCheckIdsByCheckType = Array.from(universalCheckIds).reduce(
        (byCheckType, checkId) => {
          const probe = probesByCheckId[checkId];
          const checkType = probe.check.type;
          byCheckType[checkType] = byCheckType[checkType] || [];
          byCheckType[checkType].push(checkId);
          return byCheckType;
        },
        {},
      );
      for (const checkType of Object.keys(universalCheckIdsByCheckType)) {
        const checkIds = universalCheckIdsByCheckType[checkType];
        if (checkIds.length) {
          groupsById[`${checkType}:universal`] = {
            userAgentIds: [],
            checkType: checkType as ICheckType,
            checkIds: Array.from(universalCheckIds),
          };
        }
      }
    }

    // reorganize groups that aren't cleanly organized by browser group
    for (const groupId of Object.keys(groupsById)) {
      const group = groupsById[groupId];
      const groupingDetails = extractBrowserGroupings(group.userAgentIds);
      const isBucketed = groupingDetails.every(x => x[0].includes('AllProfiled'));
      if (isBucketed || group.userAgentIds.length <= 1) continue;
      for (const userAgentId of group.userAgentIds) {
        const checkType = group.checkType;
        for (const checkId of group.checkIds) {
          const newGroupId = `${checkType}:${userAgentId}`;
          groupsById[newGroupId] = groupsById[newGroupId] || {
            userAgentIds: [userAgentId],
            checkType,
            checkIds: [],
          };
          groupsById[newGroupId].checkIds.push(checkId);
        }
      }
      delete groupsById[groupId];
    }

    // sort groups
    const sortedGroups = Object.values(groupsById).sort((a, b) => {
      if (a.userAgentIds.length === 1 && b.userAgentIds.length > 1) {
        return 1;
      }
      if (a.userAgentIds.length > 1 && b.userAgentIds.length === 1) {
        return -1;
      }
      return b.checkIds.length - a.checkIds.length;
    });

    // convert groups into probes
    for (const group of sortedGroups) {
      const groupingDetails = extractBrowserGroupings(group.userAgentIds);
      const probes = group.checkIds.map(id => probesByCheckId[id]);
      const probeBucket = ProbeBucket.create(
        this.layer,
        probes,
        group.userAgentIds,
        meta.matcher,
        meta.scorer,
      );

      this.probeBuckets.push(probeBucket);
      this.probeBucketCount += 1;
      this.probeCount += group.checkIds.length;

      if (groupingDetails.every(x => x[0].includes('AllProfiled'))) {
        this.bucketedCheckCount += group.checkIds.length;
        this.bucketedProbeCount += 1;
      }
    }
  }
}

// TYPES //////

type Constructable<T> = new (...args: any[]) => T;

export interface IProbeBucketMeta {
  layerKey?: string;
  layerName: string;
  description?: string;
  matcher: Constructable<BaseMatcher>;
  scorer: Constructable<BaseScorer>;
  checks: BaseCheck[];
}
