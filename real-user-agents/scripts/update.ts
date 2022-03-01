import * as Fs from 'fs';
import * as Path from 'path';
import OsGenerator from '../data-generators/OsGenerator';
import BrowserGenerator from '../data-generators/BrowserGenerator';
import UserAgentGenerator from '../data-generators/UserAgentGenerator';
import ISlabData from '../interfaces/ISlabData';

const slabDataDir = process.env.SLAB_DATA_DIR || Path.resolve(__dirname, '../../../slab/vault/data');
const slabBasicsDir = Path.join(slabDataDir, 'basics');

const dataDir = Path.resolve(__dirname, '../data');
const osMappingsDir = Path.join(dataDir, 'os-mappings');

const slabData: ISlabData = {
  userAgents: JSON.parse(Fs.readFileSync(`${slabBasicsDir}/userAgents.json`, 'utf8')),
  chromiumBuildVersions: JSON.parse(Fs.readFileSync(`${slabBasicsDir}/chromiumBuildVersions.json`, 'utf8')),
  browserReleaseDates: JSON.parse(Fs.readFileSync(`${slabBasicsDir}/browserReleaseDates.json`, 'utf8')),
  osReleaseDates: JSON.parse(Fs.readFileSync(`${slabBasicsDir}/osReleaseDates.json`, 'utf8')),
  marketshare: JSON.parse(Fs.readFileSync(`${slabBasicsDir}/marketshare.json`, 'utf8')),
  darwinToMacOsVersionMap: JSON.parse(Fs.readFileSync(`${slabBasicsDir}/darwinToMacOsVersionMap.json`, 'utf8')),
  macOsNameToVersionMap: JSON.parse(Fs.readFileSync(`${slabBasicsDir}/macOsNameToVersionMap.json`, 'utf8')),
  macOsVersionAliasMap: JSON.parse(Fs.readFileSync(`${slabBasicsDir}/macOsVersionAliasMap.json`, 'utf8')),
  winOsNameToVersionMap: JSON.parse(Fs.readFileSync(`${slabBasicsDir}/winOsNameToVersionMap.json`, 'utf8')),
};

export default function update() {
  const keys = ['darwinToMacOsVersionMap', 'macOsNameToVersionMap', 'macOsVersionAliasMap', 'winOsNameToVersionMap'];
  for (const key of keys) {
    const filePath = Path.join(osMappingsDir, `${key}.json`);
    Fs.writeFileSync(filePath, JSON.stringify(slabData[key], null, 2));
  }

  new OsGenerator(slabData).run().save();
  new BrowserGenerator(slabData).run().save();
  new UserAgentGenerator(slabData).run().save();
}
