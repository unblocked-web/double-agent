import Config from "@double-agent/config";

export default function extractBrowserGroupings(useragentIds: string[]): [string, string[]][] {
  const { idsByGroup, hasAllOf, hasAllExcept, hasNone } = extractGroupedIds(useragentIds);
  const details: { [name: string]: string[] } = {};

  for (const useragentId of useragentIds) {
    const { osName, osVersion, browserName, browserVersion } = Config.extractMetaFromUseragentId(useragentId);
    if (hasNone.includes(useragentId)) {
      details[`${osName}-${osVersion}`] = details[`${osName}-${osVersion}`] || [];
      details[`${osName}-${osVersion}`].push(`${browserName}-${browserVersion}`);
    }
  }

  for (const groupName of Object.keys(hasAllOf).concat(Object.keys(hasAllExcept))) {
    const titleizedGroupName = (groupName.charAt(0).toUpperCase() + groupName.slice(1)).replace('-os-x', '');
    if (hasAllOf[groupName]) {
      details[`AllProfiled${titleizedGroupName}`] = [idsByGroup[groupName].length.toString()];
    } else if (hasAllExcept[groupName]) {
      details[`AllProfiled${titleizedGroupName}Except`] = hasAllExcept[groupName];
    }
  }

  return Object.entries(details);
}

function extractGroupedIds(useragentIds: string[]) {
  let idsByGroup: { [groupName: string]: string[] };
  let hasAllOf: { [groupName: string]: boolean };
  let hasAllExcept: { [groupName: string]: string[] };
  let hasNone: string[];

  const browserGrouping = extractGroupedIdsBy(Config.browserNames, useragentIds);
  const osGrouping = extractGroupedIdsBy(Config.osNames, useragentIds);

  if (browserGrouping.hasNone.length <= osGrouping.hasNone.length) {
    idsByGroup = browserGrouping.idsByGroup;
    hasAllOf = browserGrouping.hasAllOf;
    hasAllExcept = browserGrouping.hasAllExcept;
    hasNone = browserGrouping.hasNone;
  } else {
    idsByGroup = osGrouping.idsByGroup;
    hasAllOf = osGrouping.hasAllOf;
    hasAllExcept = osGrouping.hasAllExcept;
    hasNone = osGrouping.hasNone;
  }

  return { idsByGroup, hasAllOf, hasAllExcept, hasNone };
}

function extractGroupedIdsBy(names: string[], useragentIds: string[]) {
  const idsByGroup: { [groupName: string]: string[] } = {};
  const hasAllOf: { [groupName: string]: boolean } = {};
  const hasAllExcept: { [groupName: string]: string[] } = {};
  const groupedIds: Set<string> = new Set();

  for (const name of names) {
    idsByGroup[name] = Config.findUseragentIdsByName(name);
    const misses = idsByGroup[name].filter(x => !useragentIds.includes(x));
    const matches = useragentIds.filter(x => idsByGroup[name].includes(x));
    const groupCount = idsByGroup[name].length;
    const missCount = misses.length;
    const matchCount = matches.length;
    if (matchCount === groupCount) {
      hasAllOf[name] = true;
    } else if (matchCount && matchCount > groupCount * 0.66 && missCount <= 5) {
      hasAllExcept[name] = misses;
    } else {
      continue;
    }
    matches.forEach(x => groupedIds.add(x));
  }

  const hasNone = useragentIds.filter(x => !groupedIds.has(x));

  return { idsByGroup, hasAllOf, hasAllExcept, hasNone };
}
