import osVersionsRaw from '../data/statcounter/os_combined.json';
import macVersions from '../data/statcounter/macos_version.json';
import winVersions from '../data/statcounter/windows_version.json';
import { IOperatingSystem, IOperatingSystemVersion, IByKey, FILE_PATH } from './Oses';
import * as Fs from 'fs';
import { createOsKey } from './OsUtils';

export default class OsGenerator {
  private byKey: IByKey = {};

  public run() {
    this.byKey = {};
    const macPct = averagePercent(osVersionsRaw.results['OS X'].map(s => Number(s)));
    const winPct = averagePercent(osVersionsRaw.results.Windows.map(s => Number(s)));

    for (let [rawOsString, rawValues] of Object.entries(macVersions.results)) {
      const os = extractOs(rawOsString, rawValues, macPct)
      this.byKey[os.key] = os;
    }

    for (let [rawOsString, rawValues] of Object.entries(winVersions.results)) {
      const os = extractOs(rawOsString, rawValues, winPct)
      this.byKey[os.key] = os;
    }
  }

  public save() {
    const data = JSON.stringify(this.byKey, null, 2);
    Fs.writeFileSync(FILE_PATH, data);
  }
}

// HELPER FUNCTIONS

function averagePercent(counts: number[]) {
  const avg = Math.round((10 * counts.reduce((tot, vl) => tot + vl, 0)) / counts.length);
  return avg / 10;
}

function extractOs(rawOsString: string, rawValues: string[], osPct: number): IOperatingSystem {
  const osString = cleanOsString(rawOsString);
  const name = extractName(osString);
  const version = extractVersion(osString);
  const osKey = createOsKey(name, version);
  const desktopPercents = rawValues.map(x => (Number(x) * osPct) / 100);
  const desktopPercent = averagePercent(desktopPercents);
  return {
    key: osKey,
    name,
    desktopPercent,
    version
  };
}

function cleanOsString(osString: string) {
  return osString
    .replace('macOS', 'OS X')
    .replace('mac OS X', 'OS X')
    .replace('OS X 10.15', 'OS X Catalina');
}

function extractName(osString: string) {
  if (osString.startsWith('Win')) return 'Windows';
  if (osString.includes('OS X')) return 'Mac OS X';
  return osString;
}

function extractVersion(osString: string): IOperatingSystemVersion {
  let name;
  let versionString = osString.replace('Win', '').replace('OS X', '').trim();

  const nameMatch = versionString.match(/^([a-z\s]+)/i);
  if (nameMatch) {
    name = nameMatch[1];
  }

  if (name === 'Other') {
    return {
      name,
      major: '0',
      minor: '0',
    }
  }

  if (osString.startsWith('OS X') && macVersionConversions[versionString]) {
    versionString = macVersionConversions[versionString];
  } else if (osString.startsWith('Win') && winVersionConversions[versionString]) {
    versionString = winVersionConversions[versionString];
  }

  let versionArray = versionString.split('.');

  return {
    major: versionArray[0],
    minor: versionArray[1],
    name: name,
  }
}

const macVersionConversions = {
  Yosemite: '10.10',
  'El Capitan': '10.11',
  Sierra: '10.12',
  'High Sierra': '10.13',
  Mojave: '10.14',
  Catalina: '10.15',
  Mavericks: '10.9',
  Leopard: '10.5',
  'Snow Leopard': '10.6',
  Lion: '10.7',
  'Mountain Lion': '10.8',
};

const winVersionConversions = {
  Vista: '6.0',
  XP: '5.2',
}
