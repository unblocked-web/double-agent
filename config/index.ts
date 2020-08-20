import Fs from 'fs';
import Path from 'path';
import { createOsIdFromUseragent } from '@double-agent/real-user-agents/lib/OsUtils';
import { createBrowserIdFromUseragent } from '@double-agent/real-user-agents/lib/BrowserUtils';

const dataDir = Path.join(__dirname, 'data');
const profilesDir = Path.join(dataDir, 'profiles');
const profilePathsMap: { [pluginId: string]: { [useragentId: string]: string } } = {};
const useragentIds: Set<string> = new Set();

if (!Fs.existsSync(profilesDir)) {
  Fs.mkdirSync(profilesDir);
}

let useragentStrings;

// LOAD DATA ////////////////////////////////////////////////////////////////////////////////////

for (const useragentIdWithoutMinor of Fs.readdirSync(profilesDir)) {
  const minorVersionsDir = Path.join(profilesDir, useragentIdWithoutMinor);
  if (!Fs.lstatSync(minorVersionsDir).isDirectory()) continue;

  for (const minorVersion of Fs.readdirSync(minorVersionsDir)) {
    const useragentId = `${useragentIdWithoutMinor}-${minorVersion}`;
    const profileDir = Path.join(minorVersionsDir, minorVersion);
    if (!Fs.lstatSync(profileDir).isDirectory()) continue;

    for (const fileName of Fs.readdirSync(profileDir)) {
      if (!fileName.endsWith('.json') || fileName.startsWith('_')) continue;
      const pluginId = fileName.replace('.json', '');
      const profilePath = Path.join(profileDir, fileName);
      profilePathsMap[pluginId] = profilePathsMap[pluginId] || {};
      profilePathsMap[pluginId][useragentId] = profilePath;
      useragentIds.add(useragentId);
    }
  }
}

/////// /////////////////////////////////////////////////////////////////////////////////////

export function createUseragentId(useragent: string): string {
  const osKey = createOsIdFromUseragent(useragent);
  const browserKey = createBrowserIdFromUseragent(useragent);
  return createUseragentIdFromKeys(osKey, browserKey);
}

export function createUseragentIdFromKeys(osKey: string, browserKey: string) {
  return `${osKey}--${browserKey}`;
}

/////// /////////////////////////////////////////////////////////////////////////////////////

export default class Config {
  static get useragentIds() {
    return Array.from(useragentIds);
  }

  static get useragents() {
    useragentStrings = useragentStrings || this.getProfiles('tcp/ttl').map(p => p.useragent);
    return [...useragentStrings];
  }

  static get browserNames(): string[] {
    const names = this.useragentIds.map(useragentId => this.extractMetaFromUseragentId(useragentId).browserName);
    return Array.from(new Set(names));
  }

  static get osNames(): string[] {
    const names = this.useragentIds.map(useragentId => this.extractMetaFromUseragentId(useragentId).osName);
    return Array.from(new Set(names));
  }

  static findUseragentIdsByName(name: string) {
    return this.useragentIds.filter(useragentId => {
      const meta = this.extractMetaFromUseragentId(useragentId);
      return [meta.osName, meta.browserName].includes(name);
    });
  }

  static extractMetaFromUseragentId(useragentId: string) {
    const matches = useragentId.match(/^(([a-z-]+)(-([0-9-]+))?)--(([a-z-]+)-([0-9-]+))$/);
    // eslint-disable-next-line prefer-const,@typescript-eslint/naming-convention,@typescript-eslint/no-unused-vars
    let [osId, osName, _, osVersion, browserId, browserName, browserVersion] = matches.slice(1);
    osVersion = osVersion || '';
    return { osId, osName, osVersion, browserId, browserName, browserVersion };
  }

  static getProfiles<TProfile = any>(pluginId: string): TProfile[] {
    const profiles: TProfile[] = [];
    if (!profilePathsMap[pluginId]) return profiles;

    Object.values(profilePathsMap[pluginId]).forEach(profilePath => {
      const data = Fs.readFileSync(profilePath, 'utf8');
      try {
        profiles.push(JSON.parse(data) as TProfile);
      } catch (error) {
        console.log(profilePath);
        throw error;
      }
    });

    return profiles;
  }

  static getProfile<TProfile = any>(pluginId: string, useragentId: string) {
    if (!useragentId.match(/^[a-z0-9-]+$/)) {
      useragentId = createUseragentId(useragentId);
    }
    const profilePathsByDirName = profilePathsMap[pluginId];
    if (!profilePathsByDirName) return;

    const profilePath = profilePathsByDirName[useragentId];
    if (!profilePath) return;

    const data = Fs.readFileSync(profilePath, 'utf8');
    try {
      return JSON.parse(data) as TProfile;
    } catch(error) {
      console.log(profilePath);
      throw error;
    }
  }
}
