import fs from 'fs';
import ICodecProfile from '../interfaces/ICodecProfile';
import { getUseragentPath } from '@double-agent/runner/lib/useragentProfileHelper';

const profilesDir = process.env.PROFILES_DIR ?? `${__dirname}`;

const entries: { [browserName: string]: ICodecProfile[] } = {};

export default function getAllProfiles() {
  if (Object.keys(entries).length) return entries;

  for (const filepath of fs.readdirSync(profilesDir)) {
    if (!filepath.endsWith('json')) continue;
    const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
    const json = JSON.parse(file) as ICodecProfile;
    const browserName = filepath.split('--').shift();
    if (!entries[browserName]) {
      entries[browserName] = [];
    }
    entries[browserName].push(json);
  }
  return entries;
}

export function getProfileForUa(userAgent: string): ICodecProfile {
  const uaGroup = getUseragentPath(userAgent);
  const browserProfile = getAllProfiles()[uaGroup];
  if (browserProfile.length) return browserProfile[0];
  return { recordingFormats: [], probablyPlays: [], maybePlays: [], useragent: '' };
}

export function equalProfiles(a: ICodecProfile, b: ICodecProfile) {
  if (a.maybePlays.toString() !== b.maybePlays.toString()) return false;
  if (a.probablyPlays.toString() !== b.probablyPlays.toString()) return false;
  if (a.recordingFormats.toString() !== b.recordingFormats.toString()) return false;
  return true;
}

export function findUniqueProfiles() {
  const uniqueProfiles: {
    profile: ICodecProfile;
    uaGroups: string[];
  }[] = [];
  for (const [browser, profiles] of Object.entries(getAllProfiles())) {
    for (const profile of profiles) {
      let existing = uniqueProfiles.find(x => equalProfiles(x.profile, profile));
      if (!existing) {
        existing = { uaGroups: [], profile };
        uniqueProfiles.push(existing);
      }
      if (!existing.uaGroups.includes(browser)) {
        existing.uaGroups.push(browser);
      }
    }
  }
  return uniqueProfiles;
}
