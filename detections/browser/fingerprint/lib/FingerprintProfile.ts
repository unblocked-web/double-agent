import IFingerprintProfile from '../interfaces/IFingerprintProfile';
import ProfilerData from '@double-agent/profiler/data';

export default class FingerprintProfile {
  public static readAll() {
    const profiles: IFingerprintProfile[] = ProfilerData.getByPluginId('browser/fingerprint')
    return profiles;
  }

  public static async save(useragent: string, data: IFingerprintProfile) {
    const profile = { ...data, useragent };
    if (process.env.GENERATE_PROFILES) {
      await ProfilerData.saveProfile('browser/fingerprint', useragent, profile);
    }
    return profile;
  }
}
