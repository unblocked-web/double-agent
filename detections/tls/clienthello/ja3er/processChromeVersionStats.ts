import { IJa3Details, IUserAgentCount } from './readJa3s';

export default function processChromeVersionStats(
  byMd5: {
    [hash: string]: IJa3Details & { count: number; userAgents: IUserAgentCount[] };
  },
  chromeVersion = '78',
) {
  const stats: ICipherStats & {
    byOs: Map<string, ICipherStats>;
  } = {
    byOs: new Map<string, ICipherStats>(),
    ...defaultCipherStats(),
  };
  for (const [key, value] of Object.entries(byMd5)) {
    for (const entry of value.userAgents) {
      if (entry.count <= 2) continue;
      if (entry.browser === 'Chrome' && entry.browserv === chromeVersion) {
        const osVersionKey = entry.os + entry.osv;
        if (!stats.byOs.has(osVersionKey)) {
          stats.byOs.set(osVersionKey, defaultCipherStats());
        }
        if (!stats.byOs.has(entry.os)) {
          stats.byOs.set(entry.os, defaultCipherStats());
        }
        const cipherStatsList = [stats, stats.byOs.get(osVersionKey), stats.byOs.get(entry.os)];
        for (const stats of cipherStatsList) {
          stats.entries += entry.count;
          if (!stats.hashes.includes(key)) stats.hashes.push(key);

          for (const cipher of value.ja3.ciphers) {
            stats.ciphers[cipher] = (stats.ciphers[cipher] ?? 0) + entry.count;
          }
          for (const ext of value.ja3.extensions) {
            stats.extensions[ext] = (stats.extensions[ext] ?? 0) + entry.count;
          }
          for (const group of value.ja3.supportedGroups) {
            stats.groups[group] = (stats.groups[group] ?? 0) + entry.count;
          }
        }
      }
    }
  }
  return stats;
}

const defaultCipherStats = () =>
  ({
    ciphers: {},
    extensions: {},
    groups: {},
    hashes: [],
    entries: 0,
  } as ICipherStats);

interface ICipherStats {
  ciphers: { [name: string]: number };
  extensions: { [name: string]: number };
  groups: { [name: string]: number };
  hashes: string[];
  entries: number;
}
