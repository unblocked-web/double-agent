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
    const universalProbeIds: Set<string> = new Set();
    const userAgentIdsByProbeId: { [path: string]: Set<string> } = {};
    const probesById: { [id: string]: Probe } = {};
    for (const check of meta.checks) {
      const probeId = check.id;
      probesById[probeId] = probesById[probeId] || Probe.create(check, pluginId);
      if (check.identity.userAgentId) {
        userAgentIdsByProbeId[probeId] = userAgentIdsByProbeId[probeId] || new Set();
        userAgentIdsByProbeId[probeId].add(check.identity.userAgentId);
      } else if (check.identity.isUniversal) {
        universalProbeIds.add(probeId);
      } else {
        throw new Error(`Check is missing userAgentId and is not universal: ${check.id}`);
      }
    }

    // organize initial groups
    const groupsById: {
      [groupId: string]: { userAgentIds: string[]; checkType: ICheckType; probeIds: string[] };
    } = {};
    for (const probeId of Object.keys(userAgentIdsByProbeId)) {
      const probe = probesById[probeId];
      const checkType = probe.check.type;
      const userAgentIds = Array.from(userAgentIdsByProbeId[probeId]).sort();
      const groupId = `${checkType}:${userAgentIds.join(':')}`;
      groupsById[groupId] = groupsById[groupId] || { userAgentIds, checkType, probeIds: [] };
      groupsById[groupId].probeIds.push(probeId);
    }

    if (universalProbeIds.size) {
      const universalProbeIdsByCheckType = Array.from(universalProbeIds).reduce(
        (byCheckType, probeId) => {
          const probe = probesById[probeId];
          const checkType = probe.check.type;
          byCheckType[checkType] = byCheckType[checkType] || [];
          byCheckType[checkType].push(probeId);
          return byCheckType;
        },
        {},
      );
      for (const checkType of Object.keys(universalProbeIdsByCheckType)) {
        const probeIds = universalProbeIdsByCheckType[checkType];
        if (probeIds.length) {
          groupsById[`${checkType}:universal`] = {
            userAgentIds: [],
            checkType: checkType as ICheckType,
            probeIds: Array.from(universalProbeIds),
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
        for (const probeId of group.probeIds) {
          const newGroupId = `${checkType}:${userAgentId}`;
          groupsById[newGroupId] = groupsById[newGroupId] || {
            userAgentIds: [userAgentId],
            checkType,
            probeIds: [],
          };
          groupsById[newGroupId].probeIds.push(probeId);
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
      return b.probeIds.length - a.probeIds.length;
    });

    // convert groups into probes
    for (const group of sortedGroups) {
      const groupingDetails = extractBrowserGroupings(group.userAgentIds);
      const probes = group.probeIds.map(id => probesById[id]);
      const probeBucket = ProbeBucket.create(
        this.layer,
        probes,
        group.userAgentIds,
        meta.matcher,
        meta.scorer,
      );

      this.probeBuckets.push(probeBucket);
      this.probeBucketCount += 1;
      this.probeCount += group.probeIds.length;

      if (groupingDetails.every(x => x[0].includes('AllProfiled'))) {
        this.bucketedCheckCount += group.probeIds.length;
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
