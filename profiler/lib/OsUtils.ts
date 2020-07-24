import { IOperatingSystemVersion } from './Oses';
import { lookup } from 'useragent';

export function createOsKey(name: string, version: IOperatingSystemVersion) {
  let tmpKey = `${name.replace(/\s/g, '_')}_${version.major}`;
  if (version.minor) tmpKey += `_${version.minor}`;

  return tmpKey.toLowerCase()
}

export function createOsKeyFromUseragent(useragent: string) {
  const userAgent = lookup(useragent);
  const userAgentOs = userAgent.os;
  const name = userAgentOs.family;
  const version = {
    major: userAgentOs.major,
    minor: userAgentOs.minor === '0' ? null : userAgentOs.minor,
  };

  return createOsKey(name, version);
}
