import IOperatingSystem from '../interfaces/IOperatingSystem';
import osTranslations from '../data/extra/osTranslations.json';
import { lookup } from 'useragent';

export function createOsKey(os: Pick<IOperatingSystem, 'name' | 'version'>) {
  const name = os.name.toLowerCase();
  if (['other', 'linux'].includes(name)) {
    return name;
  }

  let tmpKey = `${name.replace(/\s/g, '-')}-${os.version.major}`;
  if (os.version.minor) tmpKey += `-${os.version.minor}`;
  if (osTranslations[tmpKey]) return osTranslations[tmpKey];

  return tmpKey;
}

export function createOsKeyFromUseragent(useragent: string) {
  const userAgent = lookup(useragent);
  const userAgentOs = userAgent.os;
  const name = userAgentOs.family;
  const version = {
    major: userAgentOs.major,
    minor: userAgentOs.minor === '0' ? null : userAgentOs.minor,
  };

  return createOsKey({ name, version });
}
