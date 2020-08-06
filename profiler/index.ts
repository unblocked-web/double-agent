import IOperatingSystem from './interfaces/IOperatingSystem';
import IBrowser from './interfaces/IBrowser';
import { createOsKey, createOsKeyFromUseragent } from './lib/OsUtils';
import { createBrowserKey, createBrowserKeyFromUseragent } from './lib/BrowserUtils';

export function getProfileDirNameFromUseragent(useragent: string) {
  const osKey = createOsKeyFromUseragent(useragent);
  const browserKey = createBrowserKeyFromUseragent(useragent);
  return `${osKey}--${browserKey}`;
}

export function getProfileDirName(os: IOperatingSystem, browser: IBrowser) {
  const osKey = createOsKey(os);
  const browserKey = createBrowserKey(browser);
  return `${osKey}--${browserKey}`;
}
