import { IOperatingSystem } from './lib/Oses';
import IBrowser from './interfaces/IBrowser';
import { createOsKey, createOsKeyFromUseragent } from './lib/OsUtils';
import { createBrowserKey, createBrowserKeyFromUseragent } from './lib/BrowserUtils';

export function getProfileDirNameFromUseragent(useragent: string) {
  const osKey = createOsKeyFromUseragent(useragent);
  const browserKey = createBrowserKeyFromUseragent(useragent);
  return `${osKey}__${browserKey}`;
}

export function getProfileDirName(os: IOperatingSystem, browser: IBrowser) {
  const osKey = `${os.name.replace(/\s/g, '_')}_${os.version.major}_${os.version.minor || 0}`.toLowerCase(); //createOsKey(os);
  const browserKey = createBrowserKey(browser);
  return `${osKey}__${browserKey}`;
}
