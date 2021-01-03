import * as Fs from 'fs';
import * as Path from 'path';
import IBaseProfile from '@double-agent/collect/interfaces/IBaseProfile';
import getAllPlugins from '@double-agent/analyze/lib/getAllPlugins';
import Plugin from "@double-agent/analyze/lib/Plugin";
import Layer from '@double-agent/analyze/lib/Layer';
import Config, { createUserAgentIdFromIds } from '../index';
import UserAgentsToTest from '../lib/UserAgentsToTest';
import { extractProfilePathsMap, importProfile, IProfilePathsMap } from '../lib/ProfileUtils';



export default class ProbesGenerator {
  private profilePathsMap: IProfilePathsMap = {};
  private totalChecks = 0;
  private layers: Layer[] = [];
  private plugins: Plugin[] = [];

  private readonly dataDir: string;

  constructor(profilesDir: string, dataDir: string, userAgentIdsToUse?: string[]) {
    this.dataDir = dataDir || Config.dataDir;

    for (const userAgentId of Fs.readdirSync(profilesDir)) {
      const profileDir = Path.join(profilesDir, userAgentId);
      if (userAgentIdsToUse && !userAgentIdsToUse.includes(userAgentId)) continue;
      if (!Fs.lstatSync(profileDir).isDirectory()) continue;
      extractProfilePathsMap(profileDir, userAgentId, this.profilePathsMap);
    }
  }

  public run() {
    this.plugins = getAllPlugins();
  }

  public save() {
    const probeBucketsDir = Path.join(this.dataDir, 'probe-buckets');
    const probesDir = Path.join(this.dataDir, 'probes');
    if (!Fs.existsSync(probeBucketsDir)) Fs.mkdirSync(probeBucketsDir, { recursive: true });
    if (!Fs.existsSync(probesDir)) Fs.mkdirSync(probesDir, { recursive: true });

    for (const plugin of this.plugins) {
      const profiledProfiles = this.getProfiles<IBaseProfile>(plugin.id);
      plugin.initialize(profiledProfiles);

      console.log('---------------------------------------');
      console.log(`SAVING ${plugin.id}`);

      const probeBucketsData = JSON.stringify(plugin.probeBuckets, null, 2);
      Fs.writeFileSync(`${probeBucketsDir}/${plugin.id}.json`, probeBucketsData);

      const probesData = JSON.stringify(plugin.probes, null, 2);
      Fs.writeFileSync(`${probesDir}/${plugin.id}.json`, probesData);

      this.layers.push(...plugin.layers);

      for (const layer of plugin.layers) {
        const probeBuckets = plugin.probeBuckets.filter(x => x.layerId === layer.id);
        const checkCount = probeBuckets.map(p => p.probes.length).reduce((a, b) => a + b, 0);
        this.totalChecks += checkCount;
        console.log(
          `${layer.name} (${layer.id} has ${probeBuckets.length} probe buckets (${checkCount} checks)`,
        );
      }
    }

    const layersData = JSON.stringify(this.layers, null, 2);
    Fs.writeFileSync(`${this.dataDir}/layers.json`, layersData);

    console.log('======');
    console.log(`${this.totalChecks} TOTAL CHECKS`);
  }

  private getProfiles<TProfile = any>(pluginId: string): TProfile[] {
    const profiles: TProfile[] = [];
    if (!this.profilePathsMap[pluginId]) return profiles;

    Object.values(this.profilePathsMap[pluginId]).forEach(profilePath => {
      const profile = importProfile<TProfile>(profilePath);
      profiles.push(profile as TProfile);
    });

    return profiles;
  }
}
