import Fs from 'fs';
import Path from 'path';
import { createOsIdFromUserAgentString } from '@double-agent/real-user-agents/lib/OsUtils';
import { createBrowserIdFromUserAgentString } from '@double-agent/real-user-agents/lib/BrowserUtils';
import RealUserAgents from '@double-agent/real-user-agents';

const dataDir = Path.join(__dirname, 'data');
const profilesDir = Path.join(dataDir, 'profiles');
if (!Fs.existsSync(profilesDir)) Fs.mkdirSync(profilesDir);

type IProfilePath = string | { [filenameSuffix: string]: string };

const userAgentIds: Set<string> = new Set();
const profilePathsMap: {
  [pluginId: string]: {
    [userAgentId: string]: IProfilePath;
  };
} = {};

let userAgentStrings;

// LOAD DATA ////////////////////////////////////////////////////////////////////////////////////

for (const userAgentIdWithoutMinor of Fs.readdirSync(profilesDir)) {
  const minorVersionsDir = Path.join(profilesDir, userAgentIdWithoutMinor);
  if (!Fs.lstatSync(minorVersionsDir).isDirectory()) continue;

  for (const minorVersion of Fs.readdirSync(minorVersionsDir)) {
    const userAgentId = `${userAgentIdWithoutMinor}-${minorVersion}`;
    const profileDir = Path.join(minorVersionsDir, minorVersion);
    if (!Fs.lstatSync(profileDir).isDirectory()) continue;

    for (const fileName of Fs.readdirSync(profileDir)) {
      if (!fileName.endsWith('.json') || fileName.startsWith('_')) continue;
      const [pluginId, filenameSuffix] = fileName.replace('.json', '').split('--');
      const profilePath = Path.join(profileDir, fileName);
      profilePathsMap[pluginId] = profilePathsMap[pluginId] || {};
      if (filenameSuffix) {
        profilePathsMap[pluginId][userAgentId] = profilePathsMap[pluginId][userAgentId] || {};
        profilePathsMap[pluginId][userAgentId][filenameSuffix] = profilePath;
      } else {
        profilePathsMap[pluginId][userAgentId] = profilePath;
      }
      userAgentIds.add(userAgentId);
    }
  }
}

/////// /////////////////////////////////////////////////////////////////////////////////////

export function createUserAgentIdFromString(userAgentString: string): string {
  const osKey = createOsIdFromUserAgentString(userAgentString);
  const browserKey = createBrowserIdFromUserAgentString(userAgentString);
  return createUserAgentIdFromKeys(osKey, browserKey);
}

export function createUserAgentIdFromKeys(osKey: string, browserKey: string) {
  return `${osKey}--${browserKey}`;
}

/////// /////////////////////////////////////////////////////////////////////////////////////

export default class Config {
  static get userAgentIds() {
    return Array.from(userAgentIds);
  }

  static get userAgentStrings() {
    userAgentStrings = userAgentStrings || this.getProfiles('tcp/ttl').map(p => p.userAgentString);
    return [...userAgentStrings];
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

  static getProfiles<TProfile = any>(pluginId: string): TProfile[] {
    const profiles: TProfile[] = [];
    if (!profilePathsMap[pluginId]) return profiles;

    Object.values(profilePathsMap[pluginId]).forEach(profilePath => {
      const profile = importProfile<TProfile>(profilePath);
      profiles.push(profile as TProfile);
    });

    return profiles;
  }

  static getProfile<TProfile = any>(pluginId: string, userAgentId: string) {
    if (!userAgentId.match(/^[a-z0-9-]+$/)) {
      userAgentId = createUserAgentIdFromString(userAgentId);
    }
    const profilePathsByDirName = profilePathsMap[pluginId];
    if (!profilePathsByDirName) return;

    const profilePath = profilePathsByDirName[userAgentId];
    if (!profilePath) return;

    return importProfile<TProfile>(profilePath);
  }
}

function importProfile<TProfile>(profilePath: IProfilePath) {
  if (typeof profilePath === 'string') {
    const rawData = Fs.readFileSync(profilePath, 'utf8');
    try {
      return JSON.parse(rawData) as TProfile;
    } catch (error) {
      console.log(profilePath);
      throw error;
    }
  } else {
    const dataByFilenameSuffix: any = {};
    let profile;
    for (const filenameSuffix of Object.keys(profilePath)) {
      const rawData = Fs.readFileSync(profilePath[filenameSuffix], 'utf8');
      try {
        profile = JSON.parse(rawData);
      } catch (error) {
        console.log(profilePath[filenameSuffix]);
        throw error;
      }
      dataByFilenameSuffix[filenameSuffix] = profile.data;
    }
    profile.data = dataByFilenameSuffix;
    return profile as TProfile;
  }
}
