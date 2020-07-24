import Fs from 'fs';
import Path from 'path';
import { getUseragentPath } from '@double-agent/runner/lib/profileHelper';

const dataDir = Path.join(__dirname, 'data');
const profilesDir = Path.join(dataDir, 'profiles');
const profilePathsMap: { [pluginId: string]: { [agentKey: string]: string[] } } = {};
const agentKeys: Set<string> = new Set();

if (!Fs.existsSync(profilesDir)) {
  Fs.mkdirSync(profilesDir);
}

let useragentStrings;

// LOAD DATA ////////////////////////////////////////////////////////////////////////////////////

for (const agentKey of Fs.readdirSync(profilesDir)) {
  const agentDir = Path.join(profilesDir, agentKey);
  const isDirectory = Fs.lstatSync(agentDir).isDirectory()
  if (!isDirectory) continue;
  for (const fileName of Fs.readdirSync(agentDir)) {
    if (!fileName.endsWith('.json') || fileName.startsWith('_')) continue;
    const fileNameParts = fileName.replace('.json', '').split('--');
    const counter = fileNameParts[1];
    const pluginId = fileNameParts[0].replace('-', '/');
    const profilePath = `${agentDir}/${fileName}`;
    profilePathsMap[pluginId] = profilePathsMap[pluginId] || {};
    profilePathsMap[pluginId][agentKey] = profilePathsMap[pluginId][agentKey] || [];
    profilePathsMap[pluginId][agentKey][counter] = profilePath;
    agentKeys.add(agentKey);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

export default class ProfilerData {

  static get agentKeys() {
    return Array.from(agentKeys);
  }

  static get useragents() {
    useragentStrings = useragentStrings || this.getByPluginId('tcp/ttl').map(p => p.useragent);
    return [...useragentStrings];
  }

  static getByPluginId<TProfile = any>(pluginId: string) {
    const profiles: TProfile[] = [];
    if (!profilePathsMap[pluginId]) return profiles;

    Object.values(profilePathsMap[pluginId]).forEach(profilePaths => {
      profilePaths.forEach(profilePath => {
        const data = Fs.readFileSync(profilePath, 'utf8');
        const profile = JSON.parse(data) as TProfile;
        profiles.push(profile);
      });
    });

    return profiles;
  }

  static async getLatestProfile<TProfile = any>(pluginId: string, useragent: string) {
    const agentKey = getUseragentPath(useragent);
    const profilePathsByAgentKey = profilePathsMap[pluginId];
    if (!profilePathsByAgentKey) return;

    const profilePaths = profilePathsByAgentKey[agentKey];
    if (!profilePaths) return;

    const latestProfilePath = profilePaths[profilePaths.length - 1];
    if (!latestProfilePath) return;

    const data = Fs.readFileSync(latestProfilePath, 'utf8');
    try {
      return JSON.parse(data) as TProfile;
    } catch(error) {
      console.log(latestProfilePath);
      throw error;
    }
  }

  static saveProfile(pluginId: string, useragent: string, data: any) {
    // http requests from webdriver sometimes have ruby profiles
    if (!useragent || useragent.startsWith('Ruby')) return;

    const agentKey = getUseragentPath(useragent);
    const agentDir = Path.join(profilesDir, agentKey);
    if (!Fs.existsSync(agentDir)) {
      Fs.mkdirSync(agentDir);
    }

    const fileName = pluginId.replace('/', '-');
    let counter = 0;
    let filePath = Path.join(agentDir, `${fileName}--${counter}.json`);
    while (Fs.existsSync(filePath)) {
      counter += 1;
      filePath = Path.join(agentDir, `${fileName}--${counter}.json`);
    }
    Fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log('Saving profile', filePath);
  }
}
