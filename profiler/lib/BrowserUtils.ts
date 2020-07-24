import IBrowserVersion from '../interfaces/IBrowserVersion';
import { lookup } from 'useragent';

export function createBrowserKey(name: string, version: IBrowserVersion) {
  return `${name.replace(/\s/g, '_')}_${version.major}_${version.minor}`.toLowerCase()
}

export function createBrowserKeyFromUseragent(useragent: string) {
  const userAgent = lookup(useragent);
  const name = userAgent.family;
  const version = {
    major: userAgent.major,
    minor: userAgent.minor,
  };
  return createBrowserKey(name, version);
}
