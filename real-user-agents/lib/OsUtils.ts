import extractUserAgentMeta from './extractUserAgentMeta';
import IOperatingSystem from '../interfaces/IOperatingSystem';
import macOsNameToVersionMap from '../data/os-mappings/macOsNameToVersionMap.json';
import macOsVersionAliasMap from '../data/os-mappings/macOsVersionAliasMap.json';
import winOsNameToVersionMap from '../data/os-mappings/winOsNameToVersionMap.json';

export function createOsName(name: string) {
  if (name.startsWith('Win')) return 'Windows';
  if (name.includes('OS X')) return 'Mac OS';
  return name;
}

export function createOsId(os: Pick<IOperatingSystem, 'name' | 'version'>) {
  const name = os.name
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace('os-x', 'os');
  const minorVersion = os.name.startsWith('Win') && os.version.minor === '0' ? null : os.version.minor;
  if (['other', 'linux'].includes(name)) {
    return name;
  }

  let id = `${name}-${os.version.major}`;
  if (minorVersion) id += `-${os.version.minor}`;

  return id;
}

export function createOsIdFromUserAgentString(userAgentString: string) {
  const { osName, osVersion } = extractUserAgentMeta(userAgentString);
  const name = osName;
  const version = createOsVersion(name, osVersion.major, osVersion.minor);
  return createOsId({ name, version });
}

export function createOsVersion(osName: string, majorVersion: string, minorVersion: string) {
  let namedVersion;
  if (majorVersion.match(/^([a-z\s]+)/i)) {
    // majorVersion is name instead of number
    namedVersion = majorVersion;
    if (osName.startsWith('Mac') && macOsNameToVersionMap[majorVersion]) {
      let versionString = macOsNameToVersionMap[majorVersion];
      versionString = macOsVersionAliasMap[versionString] || versionString;
      [majorVersion, minorVersion] = versionString.split('.');
    } else if (osName.startsWith('Win') && winOsNameToVersionMap[majorVersion]) {
      [majorVersion, minorVersion] = winOsNameToVersionMap[majorVersion].split('.');
    }
  } else {
    // majorVersion is number so let's cleanup
    let versionString = `${majorVersion}.${minorVersion}`;
    if (osName.startsWith('Mac')) {
      versionString = convertMacOsVersionString(versionString);
      [majorVersion, minorVersion] = versionString.split('.');
      namedVersion = macOsVersionToNameMap[versionString];
    } else if (osName.startsWith('Win')) {
      namedVersion = winOsVersionToNameMap[versionString];
    }
  }

  return {
    major: majorVersion,
    minor: minorVersion,
    name: namedVersion,
  };
}

const macOsVersionToNameMap = Object.entries(macOsNameToVersionMap).reduce((obj, [a, b]) => {
  return Object.assign(obj, { [b]: a });
}, {});

const winOsVersionToNameMap = Object.entries(winOsNameToVersionMap).reduce((obj, [a, b]) => {
  return Object.assign(obj, { [b]: a });
}, {});

function  convertMacOsVersionString(versionString: string) {
  let newVersionString = macOsVersionAliasMap[versionString];
  if (!newVersionString) {
    const [majorVersion] = versionString.split('.');
    newVersionString = macOsVersionAliasMap[`${majorVersion}.*`];
  }
  return newVersionString || versionString;
}
