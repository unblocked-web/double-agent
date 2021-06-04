import * as Fs from 'fs';
import * as Path from 'path';
import ProbesGenerator from '@double-agent/config/lib/ProbesGenerator';
import Config from '@double-agent/config';

const dataDir = Path.resolve(__dirname, '../data');

(async function run() {
  const foundationalProfilesDir = Path.resolve(dataDir, 'external/0-foundational-profiles');
  const foundationalProbesDir = Path.resolve(dataDir, 'external/1-foundational-probes');
  if (!Fs.existsSync(foundationalProbesDir)) Fs.mkdirSync(foundationalProbesDir, { recursive: true });

  Config.probesDataDir = foundationalProbesDir;
  const probesGenerator = new ProbesGenerator(foundationalProfilesDir);
  await probesGenerator.run();
  await probesGenerator.save();
})().catch(console.log);
