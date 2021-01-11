import Fs from 'fs';
import Path from 'path';
import { createOsIdFromUserAgentString } from '@double-agent/real-user-agents/lib/OsUtils';
import { createBrowserIdFromUserAgentString } from '@double-agent/real-user-agents/lib/BrowserUtils';
import RealUserAgents from '@double-agent/real-user-agents';

const dataDir = Path.join(__dirname, 'data');

/////// /////////////////////////////////////////////////////////////////////////////////////

export function createUserAgentIdFromString(userAgentString: string): string {
  const osKey = createOsIdFromUserAgentString(userAgentString);
  const browserKey = createBrowserIdFromUserAgentString(userAgentString);
  return createUserAgentIdFromIds(osKey, browserKey);
}

export function createUserAgentIdFromIds(osId: string, browserId: string) {
  return `${osId}--${browserId}`;
}

interface IProbeIdsMap {
  [pluginId: string]: {
    [checkId: string]: string;
  }
}

let probeIdsMap: IProbeIdsMap;

/////// /////////////////////////////////////////////////////////////////////////////////////

export default class Config {
  static userAgentIds: string[] = [];
  static dataDir = dataDir;

  static get probeIdsMap(): IProbeIdsMap {
    if (!probeIdsMap) {
      probeIdsMap = {};
      const probeIdsDir = Path.join(dataDir, 'probe-ids');
      for (const fileName of Fs.readdirSync(probeIdsDir)) {
        const matches = fileName.match(/^(.+)\.json$/);
        if (!matches) continue;
        const pluginId = matches[1];
        probeIdsMap[pluginId] = JSON.parse(Fs.readFileSync(`${probeIdsDir}/${fileName}`, 'utf8'));
      }
    }
    return probeIdsMap;
  }

  static get browserNames(): string[] {
    const names = this.userAgentIds.map(
      userAgentId => RealUserAgents.extractMetaFromUserAgentId(userAgentId).browserName,
    );
    return Array.from(new Set(names));
  }

  static get osNames(): string[] {
    const names = this.userAgentIds.map(
      userAgentId => RealUserAgents.extractMetaFromUserAgentId(userAgentId).operatingSystemName,
    );
    return Array.from(new Set(names));
  }

  static findUserAgentIdsByName(name: string) {
    return this.userAgentIds.filter(userAgentId => {
      const meta = RealUserAgents.extractMetaFromUserAgentId(userAgentId);
      return [meta.operatingSystemName, meta.browserName].includes(name);
    });
  }
}
