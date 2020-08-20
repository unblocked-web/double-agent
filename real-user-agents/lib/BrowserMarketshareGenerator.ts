import browserVersions from '../data/statcounter/browser_version.json';
import {createBrowserId} from "./BrowserUtils";

export default class BrowserMarketshareGenerator {
  private readonly byId: { [id: string]: number } = {};

  constructor() {
    for (const [rawBrowserString, rawValues] of Object.entries(browserVersions.results)) {
      const matches = rawBrowserString.match(/^([a-z\s]+)\s([\d.]+)/i);
      if (!matches) {
        console.log(`Could not parse browser string: ${rawBrowserString}`);
        continue;
      }
      const name = matches[1].trim();
      const versionString = matches[2];
      const versionArray = versionString.split('.');
      if (versionArray.length === 1) versionArray.push('0');

      const [major, minor] = versionArray;
      const browserId = createBrowserId({ name, version: { major, minor } });
      const percent = averagePercent(rawValues.map(v => Number(v)));
      this.byId[browserId] = percent;
    }
  }

  public get(key: string) {
    return this.byId[key] || 0;
  }
}

// HELPER FUNCTIONS

function averagePercent(counts: number[]) {
  const avg = Math.round((10 * counts.reduce((tot, vl) => tot + vl, 0)) / counts.length);
  return avg / 10;
}
