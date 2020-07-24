import {IOperatingSystem} from './Oses';
import { lookup } from 'useragent';

export function createOsKey(os: Pick<IOperatingSystem, 'name' | 'version'>) {
  let tmpKey = `${os.name.replace(/\s/g, '_')}_${os.version.major}`;
  if (os.version.minor) tmpKey += `_${os.version.minor}`;

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

  return createOsKey({ name, version });
}
