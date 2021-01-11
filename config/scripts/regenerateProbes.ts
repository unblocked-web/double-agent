import * as Fs from 'fs';
import * as Path from 'path';
import ProbesGenerator from '../data-generators/ProbesGenerator';
import Config, { createUserAgentIdFromIds } from '../index';
import UserAgentsToTest from '../lib/UserAgentsToTest';

const slabDataDir = process.env.SLAB_DATA_DIR || Path.resolve(__dirname, '../../../slab/.data');
const slabProfilesDir = Path.join(slabDataDir, 'profiles');
const slabBridgesDir = Path.join(slabDataDir, 'dom-bridges');

export default async function regenerateProbes() {
  const localBridgesDir = Path.join(Config.dataDir, 'dom-bridges');
  const fileKeysToCopy = [
    'instance-to-instance',
  ];
  if (!Fs.existsSync(localBridgesDir)) {
    Fs.mkdirSync(localBridgesDir, { recursive: true });
  }

  for (const fileKey of fileKeysToCopy) {
    const fromFilePath = Path.join(slabBridgesDir, `${fileKey}.json`);
    const toFilePath = Path.join(localBridgesDir, `${fileKey}.json`);
    const data = Fs.readFileSync(fromFilePath, 'utf8');
    Fs.writeFileSync(toFilePath, data);
  }

  const userAgentIdsToUse = UserAgentsToTest.all().map(x =>
    createUserAgentIdFromIds(x.operatingSystemId, x.browserId),
  );

  const probesGenerator = new ProbesGenerator(slabProfilesDir, Config.dataDir, userAgentIdsToUse);
  await probesGenerator.run();
  await probesGenerator.save();
}
