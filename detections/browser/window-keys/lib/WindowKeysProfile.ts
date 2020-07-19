import IWindowKeysProfile from '../interfaces/IWindowKeysProfile';
import ProfilerData from '@double-agent/profiler/data';

const generateProfiles = process.env.GENERATE_PROFILES; // ?? true;
const pluginId = 'browser/window-keys';

export default class WindowKeysProfile {
  public static async find(useragent: string) {
    return await ProfilerData.getLatestProfile<IWindowKeysProfile>(pluginId, useragent);
  }

  public static async save(useragent: string, data: IWindowKeysProfile) {
    const profile = { ...data, useragent };
    if (generateProfiles) {
      await ProfilerData.saveProfile(pluginId, useragent, profile);
    }
    return profile;
  }

  public static clean(data: IWindowKeysProfile) {
    return data;
  }
}
