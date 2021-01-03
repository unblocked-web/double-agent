import * as Fs from 'fs';
import * as Path from 'path';
import ProbesGenerator from '@double-agent/config/data-generators/ProbesGenerator';

const collectedProfilesDir = Path.resolve(__dirname, '../data/1-collected-profiles');
const extractedProbesDir = Path.resolve(__dirname, '../data/2-extracted-probes');
if (!Fs.existsSync(extractedProbesDir)) Fs.mkdirSync(extractedProbesDir, { recursive: true });

(async function run() {
  const probesGenerator = new ProbesGenerator(collectedProfilesDir, extractedProbesDir);
  await probesGenerator.run();
  await probesGenerator.save();
})().catch(console.log);
