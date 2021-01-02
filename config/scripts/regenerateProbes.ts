import * as Fs from 'fs';
import * as Path from 'path';
import IBaseProfile from '@double-agent/collect/interfaces/IBaseProfile';
import getAllPlugins from '@double-agent/analyze/lib/getAllPlugins';
import Config, { createUserAgentIdFromIds } from '../index';
import UserAgentsToTest from '../lib/UserAgentsToTest';
import { extractProfilePathsMap, importProfile, IProfilePathsMap } from '../lib/ProfileUtils';

const userAgentIdsToTest = UserAgentsToTest.all().map(x => createUserAgentIdFromIds(x.operatingSystemId, x.browserId));
const dataDir = Config.dataDir;
const probeBucketsDir = Path.join(dataDir, 'probe-buckets');
const probesDir = Path.join(dataDir, 'probes');
const slabDataDir = process.env.SLAB_DATA_DIR || Path.resolve(__dirname, '../../../slab/.data');
const slabProfilesDir = Path.join(slabDataDir, 'profiles');

if (!Fs.existsSync(probeBucketsDir)) Fs.mkdirSync(probeBucketsDir, { recursive: true });
if (!Fs.existsSync(probesDir)) Fs.mkdirSync(probesDir, { recursive: true });

const profilePathsMap: IProfilePathsMap = {};
for (const userAgentId of Fs.readdirSync(slabProfilesDir)) {
  const profileDir = Path.join(slabProfilesDir, userAgentId);
  if (!userAgentIdsToTest.includes(userAgentId)) continue;
  if (!Fs.lstatSync(profileDir).isDirectory()) continue;
  extractProfilePathsMap(profileDir, userAgentId, profilePathsMap);
}

let totalChecks = 0;
const layers = [];
const plugins = getAllPlugins();

export default function run() {
  for (const plugin of plugins) {
    const profiledProfiles = getProfiles<IBaseProfile>(plugin.id);
    plugin.initialize(profiledProfiles);

    console.log('---------------------------------------');
    console.log(`SAVING ${plugin.id}`);

    const probeBucketsData = JSON.stringify(plugin.probeBuckets, null, 2);
    Fs.writeFileSync(`${probeBucketsDir}/${plugin.id}.json`, probeBucketsData);

    const probesData = JSON.stringify(plugin.probes, null, 2);
    Fs.writeFileSync(`${probesDir}/${plugin.id}.json`, probesData);

    layers.push(...plugin.layers);

    for (const layer of plugin.layers) {
      const probeBuckets = plugin.probeBuckets.filter(x => x.layerId === layer.id);
      const checkCount = probeBuckets.map(p => p.probes.length).reduce((a, b) => a + b, 0);
      totalChecks += checkCount;
      console.log(
          `${layer.name} (${layer.id} has ${probeBuckets.length} probe buckets (${checkCount} checks)`,
      );
    }
  }

  const layersData = JSON.stringify(layers, null, 2);
  Fs.writeFileSync(`${dataDir}/layers.json`, layersData);

  console.log('======');
  console.log(`${totalChecks} TOTAL CHECKS`);

}

function getProfiles<TProfile = any>(pluginId: string): TProfile[] {
  const profiles: TProfile[] = [];
  if (!profilePathsMap[pluginId]) return profiles;

  Object.values(profilePathsMap[pluginId]).forEach(profilePath => {
    const profile = importProfile<TProfile>(profilePath);
    profiles.push(profile as TProfile);
  });

  return profiles;
}
