import fs from 'fs';
import { saveUseragentProfile } from '@double-agent/runner/lib/profileHelper';
import IDomProfile from '../interfaces/IDomProfile';

const profilesDir = `${__dirname}/../profiles`;
export default class DomProfile {
  public static readAll() {
    const profiles: IDomProfile[] = [];
    for (const filepath of fs.readdirSync(profilesDir)) {
      if (!filepath.endsWith('json') || filepath.startsWith('_')) continue;
      const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
      const json = JSON.parse(file) as IDomProfile;
      profiles.push(json);
    }
    return profiles;
  }

  public static save(useragent: string, data: IDomProfile) {
    const profile = { ...data, useragent };
    if (process.env.GENERATE_PROFILES) {
      saveUseragentProfile(useragent, profile, profilesDir);
    }
    return profile;
  }

  public static clean(data: IDomProfile) {
    return data;
  }
}
