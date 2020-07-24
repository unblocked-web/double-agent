import { IOperatingSystem } from './lib/Oses';
import { IBrowser } from './lib/Browsers';
import { createOsKey, createOsKeyFromUseragent } from './lib/OsUtils';
import { createBrowserKey, createBrowserKeyFromUseragent } from './lib/BrowserUtils';

export function getProfileDirNameFromUseragent(useragent: string) {
  const osKey = createOsKeyFromUseragent(useragent);
  const browserKey = createBrowserKeyFromUseragent(useragent);
  return `${osKey}__${browserKey}`.replace(/_\d+$/, '');
}

export function getProfileDirName(os: IOperatingSystem, browser: IBrowser) {
  const osKey = `${os.name.replace(/\s/g, '_')}_${os.version.major}_${os.version.minor || 0}`.toLowerCase(); //createOsKey(os);
  const browserKey = createBrowserKey(browser.name, browser.version);
  return `${osKey}__${browserKey}`.replace(/_\d+$/, '');
}
