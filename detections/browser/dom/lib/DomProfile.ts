import fs from 'fs';
import IDomProfile from '../interfaces/IDomProfile';
import ProfilerData from '@double-agent/profiler/data';

const generateProfiles = process.env.GENERATE_PROFILES; // ?? true;
const pluginId = 'browser/dom';

export default class DomProfile {
  public static async find(useragent: string) {
    return await ProfilerData.getLatestProfile<IDomProfile>(pluginId, useragent);
  }

  public static async save(useragent: string, data: IDomProfile) {
    const profile = { ...data, useragent };
    if (generateProfiles) {
      await ProfilerData.saveProfile(pluginId, useragent, profile);
    }
    return profile;
  }

  public static clean(data: IDomProfile) {
    return data;
  }
}
