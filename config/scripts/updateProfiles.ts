import * as Fs from 'fs';
import * as Path from 'path';
import UserAgentsToTest from '../lib/UserAgentsToTest';
import { createUserAgentIdFromKeys } from '../index';

const slabDataDir = process.env.SLAB_DATA_DIR || Path.resolve(__dirname, '../../../slab/.data');
const sourceDir = Path.join(slabDataDir, 'profiles');
const destinationDir = Path.join(__dirname, '../data/profiles');

export default function run() {
  const userAgentsToTest = UserAgentsToTest.all();
  const userAgentIds = new Set(
    userAgentsToTest.map(x => createUserAgentIdFromKeys(x.operatingSystemId, x.browserId)),
  );

  for (const userAgentId of userAgentIds) {
    const sourceProfileDir = `${sourceDir}/${userAgentId}`;
    const destinationProfileDir = extractDestinationProfileDir(userAgentId);
    if (Fs.existsSync(destinationProfileDir)) Fs.rmdirSync(destinationProfileDir, { recursive: true });
    Fs.mkdirSync(destinationProfileDir, { recursive: true });
    for (const filename of Fs.readdirSync(sourceProfileDir)) {
      const sourceFilePath = `${sourceProfileDir}/${filename}`;
      const destinationFilePath = `${destinationProfileDir}/${filename}`;
      Fs.writeFileSync(destinationFilePath, Fs.readFileSync(sourceFilePath));
    }
  }
}

function extractDestinationProfileDir(userAgentId: string) {
  const matches = userAgentId.match(/^(.+)-([0-9+])$/).slice(1);
  const [userAgentIdWithoutMinor, minorVersion] = matches;
  return `${destinationDir}/${userAgentIdWithoutMinor}/${minorVersion}`;
}
