import Fs from 'fs';
import Path from 'path';
import { createOsIdFromUserAgentString } from '@double-agent/real-user-agents/lib/OsUtils';
import { createBrowserIdFromUserAgentString } from '@double-agent/real-user-agents/lib/BrowserUtils';
import RealUserAgents from '@double-agent/real-user-agents';
import devtoolsIndicators from './data/path-patterns/devtools-indicators.json';
import instanceVariations from './data/path-patterns/instance-variations.json';
import locationVariations from './data/path-patterns/location-variations.json';
import windowVariations from './data/path-patterns/window-variations.json';

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
    [checkSignature: string]: string;
  };
}

let probeIdsMap: IProbeIdsMap;

/////// /////////////////////////////////////////////////////////////////////////////////////

export default class Config {
  static userAgentIds: string[] = [];
  static dataDir = dataDir;
  static probesDataDir: string;

  static get probeIdsMap(): IProbeIdsMap {
    if (!this.probesDataDir) {
      throw new Error('probesDataDir must be set');
    }
    if (!probeIdsMap) {
      probeIdsMap = {};
      const probeIdsDir = Path.join(this.probesDataDir, 'probe-ids');
      if (Fs.existsSync(probeIdsDir)) {
        for (const fileName of Fs.readdirSync(probeIdsDir)) {
          const matches = fileName.match(/^(.+)\.json$/);
          if (!matches) continue;
          const pluginId = matches[1];
          probeIdsMap[pluginId] = JSON.parse(Fs.readFileSync(`${probeIdsDir}/${fileName}`, 'utf8'));
        }
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

  static isAutomationPath(path: string): boolean {
    if (devtoolsIndicators.added.some(pattern => pathIsPatternMatch(path, pattern))) return true;
    if (devtoolsIndicators.extraAdded.some(pattern => pathIsPatternMatch(path, pattern)))
      return true;
    return false;
  }

  static isVariationPath(path: string): boolean {
    if (instanceVariations.changed.some(pattern => pathIsPatternMatch(path, pattern))) return true;
    if (instanceVariations.extraChanged.some(pattern => pathIsPatternMatch(path, pattern)))
      return true;
    if (locationVariations.changed.some(pattern => pathIsPatternMatch(path, pattern))) return true;
    if (locationVariations.extraChanged.some(pattern => pathIsPatternMatch(path, pattern)))
      return true;
    if (windowVariations.changed.some(pattern => pathIsPatternMatch(path, pattern))) return true;
    if (windowVariations.extraChanged.some(pattern => pathIsPatternMatch(path, pattern)))
      return true;
    return false;
  }

  static shouldIgnorePathValue(path: string): boolean {
    if (this.isAutomationPath(path)) return true;
    if (this.isVariationPath(path)) return true;
    return false;
  }
}

export function pathIsPatternMatch(path: string, pattern: string) {
  if (pattern.charAt(0) === '*') {
    return path.includes(pattern.substr(1));
  }
  return path.startsWith(pattern);
}
