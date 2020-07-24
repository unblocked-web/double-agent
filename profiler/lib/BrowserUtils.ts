import IBrowser from '../interfaces/IBrowser';
import { lookup } from 'useragent';

export function createBrowserKey(browser: Pick<IBrowser, 'name' | 'version'>) {
  return `${browser.name.replace(/\s/g, '_')}_${browser.version.major}_${browser.version.minor}`.toLowerCase()
}

export function createBrowserKeyFromUseragent(useragent: string) {
  const userAgent = lookup(useragent);
  const name = userAgent.family;
  const version = {
    major: userAgent.major,
    minor: userAgent.minor,
  };
  return createBrowserKey({ name, version });
}
