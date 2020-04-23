import fs from 'fs';
import { readLatestProfile, saveUseragentProfile } from '@double-agent/runner/lib/profileHelper';
import IDomProfile from '../interfaces/IDomProfile';

const generateProfiles = process.env.GENERATE_PROFILES; // ?? true;
const profilesDir = `${__dirname}/../profiles`;
export default class DomProfile {
  public static get filepaths() {
    return fs
      .readdirSync(profilesDir)
      .map(filepath => {
        if (!filepath.endsWith('json') || filepath.startsWith('_')) return;
        return `${profilesDir}/${filepath}`;
      })
      .filter(Boolean);
  }

  public static read(path: string) {
    const file = fs.readFileSync(path, 'utf8');
    return JSON.parse(file) as IDomProfile;
  }

  public static readAll() {
    const profiles: IDomProfile[] = [];
    for (const filepath of fs.readdirSync(profilesDir)) {
      if (!filepath.endsWith('json') || filepath.startsWith('_')) continue;
      profiles.push(DomProfile.read(`${profilesDir}/${filepath}`));
    }
    return profiles;
  }

  public static async find(useragent: string) {
    const existing = await readLatestProfile<IDomProfile>(useragent, profilesDir);
    if (existing) return existing.profile;
  }

  public static async save(useragent: string, data: IDomProfile) {
    const profile = { ...data, useragent };
    if (generateProfiles) {
      await saveUseragentProfile(useragent, profile, profilesDir);
    }
    return profile;
  }

  public static async saveHttpKeys(useragent: string, windowKeys: string[]) {
    if (generateProfiles) {
      const existing = await readLatestProfile<IDomProfile>(useragent, profilesDir);
      if (existing) {
        existing.profile.httpWindowKeys = windowKeys;
        await fs.promises.writeFile(existing.path, JSON.stringify(existing.profile, null, 2));
      } else {
        throw new Error('No base dom profile found to add to');
      }
    }
  }

  public static clean(data: IDomProfile) {
    return data;
  }
}
