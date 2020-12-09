import Path from 'path';
import Fs from 'fs';
import OsGenerator from '../data-generators/OsGenerator';
import BrowserGenerator from '../data-generators/BrowserGenerator';
import UserAgentGenerator from '../data-generators/UserAgentGenerator';
import ISlabData from '../interfaces/ISlabData';

const slabDataDir = process.env.SLAB_DATA_DIR || Path.resolve(__dirname, '../../../slab/data');
const importsDir = Path.join(slabDataDir, 'basic');

const slabData: ISlabData = {
  userAgentStrings: JSON.parse(Fs.readFileSync(`${importsDir}/userAgentStrings.json`, 'utf8')),
  chromiumBuildVersions: JSON.parse(Fs.readFileSync(`${importsDir}/chromiumBuildVersions.json`, 'utf8')),
  browserReleaseDates: JSON.parse(Fs.readFileSync(`${importsDir}/browserReleaseDates.json`, 'utf8')),
  osReleaseDates: JSON.parse(Fs.readFileSync(`${importsDir}/osReleaseDates.json`, 'utf8')),
  marketshare: JSON.parse(Fs.readFileSync(`${importsDir}/marketshare.json`, 'utf8')),
};

export default function update() {
  new OsGenerator(slabData).run().save();
  new BrowserGenerator(slabData).run().save();
  new UserAgentGenerator(slabData).run().save();
}
