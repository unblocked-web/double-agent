import * as Path from 'path';
import UserAgentsToTestGenerator from '../data-generators/UserAgentsToTestGenerator';

const slabDataDir = process.env.SLAB_DATA_DIR || Path.resolve(__dirname, '../../../slab/data');
const profilesDir = Path.join(slabDataDir, 'profiles/complete');

export default async function updateBrowserData() {
  const browsersToTestGenerator = new UserAgentsToTestGenerator(profilesDir);
  await browsersToTestGenerator.run();
  await browsersToTestGenerator.save();
}
