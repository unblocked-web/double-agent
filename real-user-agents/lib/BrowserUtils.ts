import { lookup } from 'useragent';
import IBrowser from '../interfaces/IBrowser';

export function createBrowserId(browser: Pick<IBrowser, 'name' | 'version'>) {
  const name = browser.name.toLowerCase().replace(/\s/g, '-');
  const minorVersion = name === 'edge' ? '0' : browser.version.minor;
  return `${name}-${browser.version.major}-${minorVersion}`;
}

export function createBrowserIdFromUseragent(useragent: string) {
  const userAgent = lookup(useragent);
  const name = userAgent.family;
  const version = {
    major: userAgent.major,
    minor: userAgent.minor,
  };
  return createBrowserId({ name, version });
}
