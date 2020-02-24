import browserVersions from '../data/browser_version.json';
import macVersions from '../data/macos_version.json';
import osVersionsRaw from '../data/os_combined.json';
import winVersions from '../data/windows_version.json';
import { lookup } from 'useragent';
import IStatcounterOs from '../interfaces/IStatcounterOs';
import IStatcounterBrowser from '../interfaces/IStatcounterBrowser';

const outputs: {
  [browser_os_shares: string]: {
    browsers: IStatcounterBrowser[];
    os: IStatcounterOs[];
    asOf: string;
  };
} = {};
export default async function getBrowsersToProfile(browserShare = 5, osShare = 3) {
  if (outputs[`${browserShare}_${osShare}`]) return outputs[`${browserShare}_${osShare}`];
  const browsers = getBrowserPercents().filter(x => {
    return x.averagePercent > browserShare;
  });

  const osVersions = {
    ...osVersionsRaw,
    results: { ...osVersionsRaw.results },
  };
  const macPct = averagePercent(osVersions.results['OS X']);
  const winPct = averagePercent(osVersions.results.Windows);
  delete osVersions.results['OS X'];
  delete osVersions.results.Windows;

  for (const [version, values] of Object.entries(macVersions.results)) {
    const cleanVersion = version.replace('macOS', 'OS X');
    osVersions.results[cleanVersion] = values.map(x => (Number(x) * macPct) / 100);
  }

  for (const [version, values] of Object.entries(winVersions.results)) {
    osVersions.results[version] = values.map(x => (Number(x) * winPct) / 100);
  }

  // NOTE: no support yet in browserstack for Chrome OS, so removing
  delete osVersions.results['Chrome OS'];

  const os = Object.entries(osVersions.results)
    .map(x => {
      if (x[0] === 'OS X 10.15') x[0] = 'OS X Catalina';
      const os = x[0].startsWith('Win') ? 'Windows' : x[0].startsWith('OS X') ? 'OS X' : x[0];
      return {
        os,
        version: x[0]
          .replace('Win', '')
          .replace('OS X', '')
          .trim(),
        averagePercent: averagePercent(x[1]),
      } as IStatcounterOs;
    })
    .sort((a, b) => {
      return b.averagePercent - a.averagePercent;
    })
    .filter(x => {
      return x.averagePercent > osShare;
    });

  console.log(`Browsers > ${browserShare}%`, browsers);
  console.log(`Operating Systems > ${osShare}%, not Chrome OS`, os);
  outputs[`${browserShare}_${osShare}`] = {
    browsers,
    os,
    asOf: browserVersions.fromMonthYear,
  };
  return {
    browsers,
    os,
    asOf: browserVersions.fromMonthYear,
  };
}

export function getBrowserPercents() {
  return Object.entries(browserVersions.results)
    .map(x => {
      return {
        browser: x[0].match(/(\w+)\s[\d.]+/)?.pop(),
        version: x[0].match(/\w+\s([\d.]+)/)?.pop(),
        averagePercent: averagePercent(x[1]),
        matchingUseragents(...useragents: string[]) {
          const matches: string[] = [];
          for (const userAgent of useragents) {
            const ua = lookup(userAgent);

            if (
              ua.family === this.browser &&
              (ua.major + '.' + ua.minor === this.version || ua.major === this.version)
            ) {
              matches.push(userAgent);
            }
          }
          return matches;
        },
      } as IStatcounterBrowser;
    })
    .filter(x => !!x.browser)
    .sort((a, b) => {
      return b.averagePercent - a.averagePercent;
    });
}

const macVersionsConversions = {
  Yosemite: '10_10',
  'El Capitan': '10_11',
  Sierra: '10_12',
  'High Sierra': '10_13',
  Mojave: '10_14',
  Catalina: '10_15',
};

const osConversion = {
  'OS X': 'Mac OS X',
  Windows: 'Windows',
};

export function toLooseAgent(
  browser: Pick<IStatcounterBrowser, 'browser' | 'version'>,
  os: Pick<IStatcounterOs, 'os' | 'version'>,
) {
  const agent = {
    os: {
      family: osConversion[os.os],
      major: '0',
      minor: '0',
    },
    major: browser.version.split('.').shift(),
    family: browser.browser,
  };

  let osv = os.version.split('.');
  if (osv.length === 1) osv.push('0');

  if (os.os === 'OS X') osv = macVersionsConversions[os.version].split('_');

  agent.os.major = osv[0];
  agent.os.minor = osv[1];
  return agent;
}

function averagePercent(counts: string[]) {
  const avg = Math.round((10 * counts.reduce((tot, vl) => tot + Number(vl), 0)) / counts.length);
  return avg / 10;
}
