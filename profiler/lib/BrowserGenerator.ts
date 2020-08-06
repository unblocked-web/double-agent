import Fs from 'fs';
import IOperatingSystem from '../interfaces/IOperatingSystem';
import Oses from './Oses';
import IBrowser from '../interfaces/IBrowser';
import { IByKey, FILE_PATH } from './Browsers';
import browserVersions from '../data/statcounter/browser_version.json';
import ProfilerData from '../data';
import IntoliAgents from 'user-agents';
import { lookup } from 'useragent';
import BrowserStack from './BrowserStack';
import { createOsKeyFromUseragent } from './OsUtils';
import { createBrowserKey, createBrowserKeyFromUseragent } from './BrowserUtils';
import { getProfileDirNameFromUseragent } from '../index';
import { IBrowserUseragentSource } from '../interfaces/IBrowserUseragent';

interface IUseragentSources {
  [useragent: string]: IBrowserUseragentSource[];
}

interface IPercentMap {
  [browserKey: string]: number
}

export default class BrowserGenerator {
  private byKey: IByKey;
  private readonly oses: Oses = new Oses();

  public async run() {
    this.byKey = {};
    const percentMap: IPercentMap = extractPercentMap();
    const useragents: Set<string> = new Set();
    const useragentSources: IUseragentSources = {};

    for (const useragent of ProfilerData.useragents) {
      useragents.add(useragent);
      useragentSources[useragent] = useragentSources[useragent] || [];
      useragentSources[useragent].push('BrowserStack');
    }

    const intoliUniqueKeys: Set<string> = new Set();
    const intoliAgents = new IntoliAgents({ deviceCategory: 'desktop' });
    const intoliFetchGoal = 50;
    let intoliFetchCount = 0;

    while (intoliFetchCount < intoliFetchGoal) {
      const intoliAgent = intoliAgents.random();
      const useragent = intoliAgent.data.userAgent;
      const browserKey = createBrowserKeyFromUseragent(useragent);
      if (['safari-0-0'].includes(browserKey)) continue;
      const profileDirName = getProfileDirNameFromUseragent(useragent);
      if (intoliUniqueKeys.has(profileDirName)) continue;
      intoliUniqueKeys.add(profileDirName);
      useragents.add(useragent);
      useragentSources[useragent] = useragentSources[useragent] || [];
      useragentSources[useragent].push('Intoli');
      intoliFetchCount += 1;
    }

    for (const useragent of Array.from(useragents)) {
      let browser = await extractBrowser(useragent, percentMap);
      if (this.byKey[browser.key]) {
        browser = this.byKey[browser.key];
      } else {
        this.byKey[browser.key] = browser;
      }
      let browserOs = await extractBrowserOs(browser, useragent, this.oses);
      if (browser.byOsKey[browserOs.key]) {
        browserOs = browser.byOsKey[browserOs.key];
      } else {
        browser.byOsKey[browserOs.key] = browserOs;
      }

      let hasUseragent = !!browser.byOsKey[browserOs.key].useragents.find(x => x.string === useragent);
      if (!hasUseragent) {
        browser.byOsKey[browserOs.key].useragents.push({ string: useragent, sources: useragentSources[useragent] });
      }
    }

    // update os browser percents
    for (const browser of Object.values(this.byKey)) {
      let osDesktopPercentTotal = 0;
      for (const browserOs of Object.values(browser.byOsKey)) {
        const os = this.oses.getByKey(browserOs.key);
        osDesktopPercentTotal += os ? os.desktopPercent : 0;
      }
      for (const browserOs of Object.values(browser.byOsKey)) {
        const os = this.oses.getByKey(browserOs.key);
        const percentOfOsTraffic = os ? os.desktopPercent / osDesktopPercentTotal : 0;
        browserOs.desktopPercent = Math.floor(browser.desktopPercent * percentOfOsTraffic)
      }
    }
  }

  public save() {
    const data = JSON.stringify(this.byKey, null, 2);
    Fs.writeFileSync(FILE_PATH, data);
  }
}

// HELPER FUNCTIONS

function extractPercentMap() {
  const percentMap: { [browserKey: string]: number } = {};

  for (let [rawBrowserString, rawValues] of Object.entries(browserVersions.results)) {
    const matches = rawBrowserString.match(/^([a-z\s]+)\s([\d\.]+)/i);
    if (!matches) {
      console.log(`Could not parse browser string: ${rawBrowserString}`);
      continue;
    }
    const name = matches[1].trim();
    const versionString = matches[2];
    const versionArray = versionString.split('.');
    if (versionArray.length === 1) versionArray.push('0');

    const version = {
      major: versionArray[0],
      minor: versionArray[1],
    }
    const browserKey = createBrowserKey({ name, version });
    const percent = averagePercent(rawValues.map(v => Number(v)));
    percentMap[browserKey] = percent;
  }

  return percentMap;
}

async function extractBrowser(
    useragent: string,
    percentMap: IPercentMap,
): Promise<IBrowser> {
  const userAgent = lookup(useragent);
  const name = userAgent.family;
  const version = {
    major: userAgent.major,
    minor: userAgent.minor,
  };
  const browserKey = createBrowserKey({ name, version });
  const desktopPercent = percentMap[browserKey];

  return {
    key: browserKey,
    name,
    desktopPercent,
    version,
    byOsKey: {},
  }
}

async function extractBrowserOs(browser: IBrowser, useragent: string, oses: Oses) {
  const osKey = createOsKeyFromUseragent(useragent);
  const os = oses.getByKey(osKey);
  if (!os) {
    console.log('MISSING OS', osKey);
  }
  const hasBrowserStackSupport = await isBrowserStackSupported(browser, os);
  return {
    key: osKey,
    desktopPercent: null,
    hasBrowserStackSupport,
    useragents: []
  };
}

async function isBrowserStackSupported(browser: IBrowser, os: IOperatingSystem) {
  if (!browser || !os) return false;
  const browserStackAgent = BrowserStack.createAgent(browser, os);
  return !!(await BrowserStack.isBrowserSupported(browserStackAgent));
}

function averagePercent(counts: number[]) {
  const avg = Math.round((10 * counts.reduce((tot, vl) => tot + vl, 0)) / counts.length);
  return avg / 10;
}
