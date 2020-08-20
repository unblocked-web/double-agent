import { lookup } from 'useragent';
import IOperatingSystem from '../interfaces/IOperatingSystem';

export function createOsName(name: string) {
  if (name.startsWith('Win')) return 'Windows';
  if (name.includes('OS X')) return 'Mac OS';
  return name;
}

export function createOsId(os: Pick<IOperatingSystem, 'name' | 'version'>) {
  const name = os.name.toLowerCase().replace(/\s/g, '-').replace('os-x', 'os');
  const minorVersion = os.version.minor === '0' ? null : os.version.minor
  if (['other', 'linux'].includes(name)) {
    return name;
  }

  let id = `${name}-${os.version.major}`;
  if (minorVersion) id += `-${os.version.minor}`;

  return id;
}

export function createOsIdFromUseragent(useragent: string) {
  const userAgent = lookup(useragent);
  const userAgentOs = userAgent.os;
  const name = userAgentOs.family;
  const version = createOsVersion(name, userAgentOs.major, userAgentOs.minor);

  return createOsId({ name, version });
}

export function createOsVersion(osName: string, majorVersion: string, minorVersion: string) {
  let namedVersion;
  if (majorVersion.match(/^([a-z\s]+)/i)) {
    namedVersion = majorVersion;
    if (osName.startsWith('Mac') && macNameToVersion[majorVersion]) {
      [majorVersion, minorVersion] = macNameToVersion[majorVersion].split('.');
    } else if (osName.startsWith('Win') && winNameToVersion[majorVersion]) {
      [majorVersion, minorVersion] = winNameToVersion[majorVersion].split('.');
    }
  } else {
    const versionString = `${majorVersion}.${minorVersion}`;
    if (osName.startsWith('Mac') && macVersionToName[versionString]) {
      namedVersion = macVersionToName[versionString];
    } else if (osName.startsWith('Win') && winVersionToName[versionString]) {
      namedVersion = winVersionToName[versionString];
    }
  }

  return {
    major: majorVersion,
    minor: minorVersion,
    name: namedVersion,
  }
}

const macNameToVersion = {
  Catalina: '10.15',
  Mojave: '10.14',
  'High Sierra': '10.13',
  Sierra: '10.12',
  'El Capitan': '10.11',
  Yosemite: '10.10',
  Mavericks: '10.9',
  'Mountain Lion': '10.8',
  Lion: '10.7',
  'Snow Leopard': '10.6',
  Leopard: '10.5',
};

const macVersionToName = Object.entries(macNameToVersion).reduce((obj, [a, b]) => {
  return Object.assign(obj, { [b]: a });
}, {});

const winNameToVersion = {
  Vista: '6.0',
  XP: '5.2',
}

const winVersionToName = Object.entries(winNameToVersion).reduce((obj, [a, b]) => {
  return Object.assign(obj, { [b]: a });
}, {});
