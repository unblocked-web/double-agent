import fs from 'fs';
import { saveUseragentProfile } from '@double-agent/runner/lib/profileHelper';
import IFingerprintProfile from '../interfaces/IFingerprintProfile';

const profilesDir = `${__dirname}/../profiles`;
export default class FingerprintProfile {
  public static readAll() {
    const profiles: IFingerprintProfile[] = [];
    for (const filepath of fs.readdirSync(profilesDir)) {
      if (!filepath.endsWith('json') || filepath.startsWith('_')) continue;
      const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
      const json = JSON.parse(file) as IFingerprintProfile;
      profiles.push(json);
    }
    return profiles;
  }

  public static async save(useragent: string, data: IFingerprintProfile) {
    const profile = { ...data, useragent };
    if (process.env.GENERATE_PROFILES) {
      await saveUseragentProfile(useragent, profile, profilesDir);
    }
    return profile;
  }
}
