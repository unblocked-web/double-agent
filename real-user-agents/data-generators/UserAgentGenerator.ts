import * as Fs from 'fs';
import { createUserAgentIdFromKeys } from '@double-agent/config';
import IUserAgent from '../interfaces/IUserAgent';
import { FILE_PATH } from '../index';
import IBrowser from '../interfaces/IBrowser';
import IOperatingSystem from '../interfaces/IOperatingSystem';
import { createOsIdFromUserAgentString } from '../lib/OsUtils';
import { createBrowserId } from '../lib/BrowserUtils';
import { FILE_PATH as OS_FILE_PATH } from '../lib/OperatingSystems';
import { FILE_PATH as BROWSER_FILE_PATH } from '../lib/Browsers';
import extractUserAgentMeta from '../lib/extractUserAgentMeta';
import ISlabData from '../interfaces/ISlabData';

export default class UserAgentGenerator {
  private byId: { [id: string]: IUserAgent } = {};

  constructor(private slabData: ISlabData) {}

  public run() {
    // eslint-disable-next-line global-require,import/no-dynamic-require
    const osesById = require(OS_FILE_PATH) as { [id: string]: IOperatingSystem };
    // eslint-disable-next-line global-require,import/no-dynamic-require
    const browsersById = require(BROWSER_FILE_PATH) as { [id: string]: IBrowser };

    for (const userAgentString of this.slabData.userAgentStrings) {
      const { name, version } = extractUserAgentMeta(userAgentString);
      const browserId = createBrowserId({ name, version });
      const osId = createOsIdFromUserAgentString(userAgentString);
      const userAgentId = createUserAgentIdFromKeys(osId, browserId);
      const strings =
        name === 'Chrome' ? this.expandChromeString(userAgentString, version) : [userAgentString];
      const userAgent: IUserAgent = {
        id: userAgentId,
        strings,
        operatingSystemId: osId,
        browserId,
        marketshare: 0,
      };
      this.byId[userAgentId] = userAgent;
    }

    for (const browser of Object.values(browsersById)) {
      const userAgents = Object.values(this.byId).filter(x => x.browserId === browser.id);
      const osPercentTotal = userAgents.reduce((total, x) => {
        return total + osesById[x.operatingSystemId].marketshare;
      }, 0);
      for (const userAgent of userAgents) {
        const os = osesById[userAgent.operatingSystemId];
        const percentOfOsTraffic = os ? os.marketshare / osPercentTotal : 0;
        userAgent.marketshare = Math.floor(browser.marketshare * percentOfOsTraffic * 100) / 100;
      }
    }
    return this;
  }

  public save() {
    const userAgentsData = JSON.stringify(this.byId, null, 2);
    Fs.writeFileSync(FILE_PATH, userAgentsData);
    return this;
  }

  private expandChromeString(userAgentString: string, version: { major: string; minor: string }) {
    const regexp = new RegExp(`Chrome/(${version.major}.${version.minor}.([0-9]+).[0-9]+)`);
    const matches = userAgentString.match(regexp);
    const fullVersion = matches[1];
    const patchVersion = matches[2];
    const builds = this.slabData.chromiumBuildVersions
      .filter(x => x.startsWith(`${version.major}.${version.minor}.${patchVersion}`))
      .sort()
      .reverse();
    if (!builds.some(x => userAgentString.includes(x))) {
      throw new Error(`COULD NOT FIND BUILD: ${userAgentString}`);
    }
    const strings = [userAgentString];

    for (const build of builds) {
      strings.push(userAgentString.replace(`Chrome/${fullVersion}`, `Chrome/${build}`));
    }

    return strings;
  }
}
