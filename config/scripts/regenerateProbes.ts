import * as Path from 'path';
import ProbesGenerator from '../data-generators/ProbesGenerator';
import Config, { createUserAgentIdFromIds } from '../index';
import UserAgentsToTest from '../lib/UserAgentsToTest';

const slabDataDir = process.env.SLAB_DATA_DIR || Path.resolve(__dirname, '../../../slab/.data');
const profilesDir = Path.join(slabDataDir, 'profiles');

export default async function regenerateProbes() {
  const userAgentIdsToUse = UserAgentsToTest.all().map(x =>
    createUserAgentIdFromIds(x.operatingSystemId, x.browserId),
  );

  const probesGenerator = new ProbesGenerator(profilesDir, Config.dataDir, userAgentIdsToUse);
  await probesGenerator.run();
  await probesGenerator.save();
}
