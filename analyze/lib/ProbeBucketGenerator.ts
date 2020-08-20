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
    const useragentIdsByProbeId: { [path: string]: Set<string> } = {};
    const probesById: { [id: string]: Probe } = {};
    for (const check of meta.checks) {
      const probeId = check.id;
      probesById[probeId] = probesById[probeId] || Probe.create(check, pluginId);
      if (check.identity.useragentId) {
        useragentIdsByProbeId[probeId] = useragentIdsByProbeId[probeId] || new Set();
        useragentIdsByProbeId[probeId].add(check.identity.useragentId);
      } else if (check.identity.isUniversal) {
        universalProbeIds.add(probeId);
      } else {
        throw new Error(`Check is missing useragentId and is not universal: ${check.id}`);
      }
    }

    // organize initial groups
    const groupsById: {
      [groupId: string]: { useragentIds: string[]; checkType: ICheckType; probeIds: string[] };
    } = {};
    for (const probeId of Object.keys(useragentIdsByProbeId)) {
      const probe = probesById[probeId];
      const checkType = probe.check.type;
      const useragentIds = Array.from(useragentIdsByProbeId[probeId]).sort();
      const groupId = `${checkType}:${useragentIds.join(':')}`;
      groupsById[groupId] = groupsById[groupId] || { useragentIds, checkType, probeIds: [] };
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
            useragentIds: [],
            checkType: checkType as ICheckType,
            probeIds: Array.from(universalProbeIds),
          };
        }
      }
    }

    // reorganize groups that aren't cleanly organized by browser group
    for (const groupId of Object.keys(groupsById)) {
      const group = groupsById[groupId];
      const groupingDetails = extractBrowserGroupings(group.useragentIds);
      const isBucketed = groupingDetails.every(x => x[0].includes('AllProfiled'));
      if (isBucketed || group.useragentIds.length <= 1) continue;
      for (const useragentId of group.useragentIds) {
        const checkType = group.checkType;
        for (const probeId of group.probeIds) {
          const newGroupId = `${checkType}:${useragentId}`;
          groupsById[newGroupId] = groupsById[newGroupId] || {
            useragentIds: [useragentId],
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
      if (a.useragentIds.length === 1 && b.useragentIds.length > 1) {
        return 1;
      }
      if (a.useragentIds.length > 1 && b.useragentIds.length === 1) {
        return -1;
      }
      return b.probeIds.length - a.probeIds.length;
    });

    // convert groups into probes
    for (const group of sortedGroups) {
      const groupingDetails = extractBrowserGroupings(group.useragentIds);
      const probes = group.probeIds.map(id => probesById[id]);
      const probeBucket = ProbeBucket.create(
        this.layer,
        probes,
        group.useragentIds,
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
