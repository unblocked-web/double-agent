import * as Fs from 'fs';
import * as Path from 'path';
import OsGenerator from '../data-generators/OsGenerator';
import BrowserGenerator from '../data-generators/BrowserGenerator';
import UserAgentGenerator from '../data-generators/UserAgentGenerator';
import ISlabData from '../interfaces/ISlabData';

const dataDir = process.env.SLAB_DATA_DIR || Path.resolve(__dirname, '../../../slab/.data');
const basicsDir = Path.join(dataDir, 'basics');

const slabData: ISlabData = {
  userAgentStrings: JSON.parse(Fs.readFileSync(`${basicsDir}/userAgentStrings.json`, 'utf8')),
  chromiumBuildVersions: JSON.parse(Fs.readFileSync(`${basicsDir}/chromiumBuildVersions.json`, 'utf8')),
  browserReleaseDates: JSON.parse(Fs.readFileSync(`${basicsDir}/browserReleaseDates.json`, 'utf8')),
  osReleaseDates: JSON.parse(Fs.readFileSync(`${basicsDir}/osReleaseDates.json`, 'utf8')),
  marketshare: JSON.parse(Fs.readFileSync(`${basicsDir}/marketshare.json`, 'utf8')),
};

export default function update() {
  new OsGenerator(slabData).run().save();
  new BrowserGenerator(slabData).run().save();
  new UserAgentGenerator(slabData).run().save();
}
