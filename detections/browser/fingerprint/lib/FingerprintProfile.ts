import { appendFile, readdirSync, readFileSync } from 'fs';
import { getUseragentPath } from '@double-agent/runner/lib/useragentProfileHelper';
import IFingerprintProfile from '../interfaces/IFingerprintProfile';

export default class FingerprintProfile {
  public static readAll() {
    const profiles: IFingerprintProfile[] = [];
    for (const file of readdirSync(`${__dirname}/../profiles`)) {
      if (!file.endsWith('.json') || file.startsWith('_')) continue;
      const contents = readFileSync(`${__dirname}/../profiles/${file}`, 'utf8');
      const entries = contents.split('\n').filter(Boolean).map(x => JSON.parse(x) as IFingerprintProfile);
      const areAllSame = entries.filter(x => x.fullHash === entries[0].fullHash);
      if (areAllSame.length !== entries.length) {
        console.log(
          'WARN: we were operating under assumption that fingerprint hashes are static across sessions. That changed with at least: ',
          {
            profile: file,
            useragent: entries[0].useragent,
            diffs: entries.length - areAllSame.length,
          },
        );
        throw new Error('Fingerprints no longer are the same across sessions in the same browser');
      }
      profiles.push(entries[0]);
    }
    return profiles;
  }

  public static save(useragent: string, data: IFingerprintProfile) {
    const profile = { ...data, useragent };
    if (process.env.GENERATE_PROFILES) {
      appendFile(
        __dirname + '/../profiles/' + getUseragentPath(useragent) + '.json',
        JSON.stringify({ ...data, useragent }) + '\n',
        () => null,
      );
    }
    return profile;
  }
}
