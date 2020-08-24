import * as Fs from 'fs';
import * as Path from 'path';
import 'source-map-support/register';
import DomProfile from '@double-agent/browser-dom/lib/DomProfile';
import deepDiff from '@double-agent/browser-dom/lib/deepDiff';
import ProfilerData from '@double-agent/profiler/data';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';
import { createOsKeyFromUseragent } from '@double-agent/profiler/lib/OsUtils';
import emulators from '../emulators.json';

const browserKeys: string[] = emulators.map(x => x.key);

const dataDir = Path.join(__dirname, '../data');
const emulationsDir = Path.join(dataDir, 'emulations');

export default async function exportChromeAndNavigator() {
  if (!Fs.existsSync(dataDir)) {
    throw new Error('FATAL: data/emulations directory must be created!!');
  }

  const browserNavigators: IBrowserNavigators = {};
  const browserChromes: IBrowserChromes = {};

  for (const useragent of ProfilerData.useragents) {
    const profileDirName = getProfileDirNameFromUseragent(useragent);
    const browserKey = browserKeys.find(x => profileDirName.includes(x));
    if (!browserKey) {
      continue;
    }

    const profile = await DomProfile.find(useragent);
    if (!profile) {
      continue;
    }

    const osKey = createOsKeyFromUseragent(useragent);

    browserChromes[browserKey] = browserChromes[browserKey] || [];
    browserNavigators[browserKey] = browserNavigators[browserKey] || [];
    browserNavigators[browserKey].push({ osKey, navigator: profile.dom.window.navigator });

    if (profile.dom.window.chrome) {
      const keys = Object.keys(profile.dom.window);
      const index = keys.indexOf('chrome');
      const prevProperty = keys[index - 1];
      browserChromes[browserKey].push({
        osKey,
        chrome: profile.dom.window.chrome,
        prevProperty,
      });
    }
  }

  for (const browserKey of browserKeys) {
    warnForNavigatorOsDifferences(browserNavigators, browserKey);
    warnForChromeOsDifferences(browserChromes, browserKey);
    const navigators = browserNavigators[browserKey];
    const chromes = browserChromes[browserKey];
    const emulationName = browserKey.toLowerCase().replace('_', '-');
    const basePath = Path.join(emulationsDir, `emulate-${emulationName}`);
    if (navigators.length) {
      Fs.writeFileSync(
        `${basePath}/navigator.json`,
        JSON.stringify(navigators[0], null, 2),
        'utf8',
      );
    }
    if (chromes.length) {
      Fs.writeFileSync(`${basePath}/chrome.json`, JSON.stringify(chromes[0], null, 2), 'utf8');
    }
  }
}

function warnForNavigatorOsDifferences(browserNavigators: IBrowserNavigators, browserKey: string) {
  const navigators = browserNavigators[browserKey];
  const firstNavigator = navigators[0].navigator;
  for (const entry of navigators.slice(1)) {
    const navigatorDiff = deepDiff(firstNavigator, entry.navigator);
    if (navigatorDiff.added.length) {
      console.log(
        'WARN: Browser navigator has added props for this OS',
        browserKey,
        entry.osKey,
        navigatorDiff.added,
      );
    }
    if (navigatorDiff.missing.length) {
      console.log(
        'WARN: Browser navigator has removed props for this OS',
        browserKey,
        entry.osKey,
        navigatorDiff.missing,
      );
    }
  }
}

function warnForChromeOsDifferences(browserChromes: IBrowserChromes, browserKey: string) {
  const chromes = browserChromes[browserKey] ?? [];
  const firstChrome = chromes[0];
  for (const entry of chromes.slice(1)) {
    if (entry.prevProperty !== firstChrome.prevProperty) {
      console.log(
        'WARN: Browser chrome has different prev property by osKey',
        browserKey,
        entry.osKey,
        entry.prevProperty,
        firstChrome.prevProperty,
      );
    }
    const diff = deepDiff(firstChrome.chrome, entry.chrome);
    if (diff.added.length) {
      console.log(
        'WARN: Browser chrome has added props for this OS',
        browserKey,
        entry.osKey,
        diff.added,
      );
    }
    if (diff.missing.length) {
      console.log(
        'WARN: Browser chrome has removed props for this OS',
        browserKey,
        entry.osKey,
        diff.missing,
      );
    }
  }
}

// INTERFACES

interface IBrowserChromes {
  [browserKey: string]: { osKey: string; chrome: any; prevProperty: string }[];
}

interface IBrowserNavigators {
  [browserKey: string]: { osKey: string; navigator: any }[];
}
