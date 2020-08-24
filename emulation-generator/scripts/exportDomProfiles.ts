import * as Fs from 'fs';
import * as Path from 'path';
import 'source-map-support/register';
import DomProfile from '@double-agent/browser-dom/lib/DomProfile';
import deepDiff from '@double-agent/browser-dom/lib/deepDiff';
import IDomProfile from '@double-agent/browser-dom/interfaces/IDomProfile';
import {
  isAllowedToBeMissing,
  isAllowedValueDifference,
  isWebdriverProp,
} from '@double-agent/browser-dom/checks/domMatch';
import ProfilerData from '@double-agent/profiler/data';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';
import { createOsKeyFromUseragent } from '@double-agent/profiler/lib/OsUtils';
import emulators from '../emulators.json';

export default async function exportDomProfiles() {
  const dataDir = Path.join(__dirname, '../data');
  const emulationsDir = Path.join(dataDir, 'emulations');
  if (!Fs.existsSync(dataDir)) {
    throw new Error('FATAL: data/emulations directory must be created!!');
  }

  const domDumps = Fs.readdirSync(`${dataDir}/dom-dumps`);

  for (const emulator of emulators) {
    const browserKey = emulator.key;
    const matches = domDumps.filter(x => x.includes(emulator.engine));
    for (const profileDump of matches) {
      let runtimeOs = 'linux';
      if (profileDump.startsWith('mac')) runtimeOs = 'mac';
      else if (profileDump.startsWith('windows')) runtimeOs = 'windows';
      console.log(browserKey, profileDump);
      const browserPolyfills = await generateProfile(
        `${dataDir}/dom-dumps/${profileDump}`,
        browserKey,
      );

      const emulationName = browserKey.toLowerCase().replace('_', '-');
      const basePath = Path.join(emulationsDir, `emulate-${emulationName}`);
      savePolyfills(basePath, browserPolyfills[browserKey], `${runtimeOs}`);
    }
  }
}

export async function generateProfile(filepath: string, browserKey: string) {
  const file = Fs.readFileSync(filepath, 'utf8');

  const targetProfile = JSON.parse(file) as IDomProfile;
  const browserPolyfills: IBrowserPolyfills = {};

  for (const useragent of ProfilerData.useragents) {
    const profileDirName = getProfileDirNameFromUseragent(useragent);
    if (!profileDirName.includes(browserKey)) {
      continue;
    }

    const profile = await DomProfile.find(useragent);
    if (!profile) {
      continue;
    }

    const osKey = createOsKeyFromUseragent(useragent);

    browserPolyfills[browserKey] = browserPolyfills[browserKey] || [];

    const changes = extractPolyfill(profile, targetProfile);
    browserPolyfills[browserKey].push({
      osKey,
      ...changes,
    });
  }
  return browserPolyfills;
}

function savePolyfills(outputPath: string, browserPolyfill: IBrowserPolyfill[], runtimeOs: string) {
  if (!browserPolyfill || !browserPolyfill.length) return;

  if (!Fs.existsSync(`${outputPath}/${runtimeOs}`)) Fs.mkdirSync(`${outputPath}/${runtimeOs}`);

  for (const poly of browserPolyfill) {
    let polyfillName = '';
    if (poly.osKey.startsWith('mac')) {
      polyfillName = '_mac';
    } else if (poly.osKey) {
      polyfillName = `_${poly.osKey}`;
    }

    Fs.writeFileSync(
      `${outputPath}/${runtimeOs}/polyfill${polyfillName}.json`,
      JSON.stringify(poly, null, 2),
      'utf8',
    );
  }
}

function extractPolyfill(profile: IDomProfile, targetProfile: IDomProfile) {
  const diff = deepDiff(profile.dom, targetProfile.dom);
  for (const path of diff.same) {
    if (isWebdriverProp(path)) {
      if (path.endsWith('._function')) {
        const removePath = path.split('._function').shift();
        if (!diff.added.some(x => x.path === removePath)) {
          diff.added.push({ path: removePath });
        }
      }
    }
  }
  delete diff.same;
  diff.missing = diff.missing.filter(x => {
    if (isAllowedToBeMissing(x.path)) return false;
    if (x.path.includes('.plugins')) return false;
    if (x.path.includes('.mimeTypes')) return false;
    if (x.path.includes('document.scripts')) return false;
    if (x.path.includes('document.styleSheets')) return false;
    if (x.path.includes('window.navigator.languages.')) return false;
    if (x.path === 'window.chrome') return false; //already explicitly exported

    return true;
  });
  diff.changed = diff.changed.filter(x => {
    if (isAllowedValueDifference(x)) return false;
    if (x.path.includes('Notification.permission')) return false;
    if (x.path.includes('window.origin')) return false;
    if (x.path.includes('window.document.cookie')) return false;
    if (x.path.includes('window.performance.timing')) return false;
    if (x.path.includes('baseLatency._value')) return false;
    if (x.path === 'window.navigator.platform._value') return false;
    if (x.path === 'window.screen.orientation.type._value') return false;
    return true;
  });

  const hasDiff =
    diff.added.length || diff.changed.length || diff.missing.length || diff.order.length;
  if (hasDiff) {
    const additions = diff.missing.map(x => {
      let pathParts = x.path.split('.');
      let propertyName: string;
      if (x.path.includes('Symbol(')) {
        const symbolSplit = x.path.split('.Symbol(');
        propertyName = symbolSplit.pop().replace(')', '');
        pathParts = symbolSplit.shift().split('.');
      } else {
        propertyName = pathParts.pop();
      }
      const parentPath = pathParts.join('.');
      const parent = get(profile.dom, parentPath);
      const keys = Object.keys(parent);

      const prevProperty = keys[keys.indexOf(propertyName) - 1];
      return {
        path: pathParts.join('.'),
        propertyName,
        prevProperty,
        property: x.lhs,
      };
    });

    // sort for dependencies
    additions.sort((a, b) => {
      if (a.prevProperty && a.prevProperty === b.propertyName) return 1;
      if (b.prevProperty && b.prevProperty === a.propertyName) return -1;
      const aProtos = a.property._protos;
      if (
        aProtos &&
        b.path === 'window' &&
        (aProtos.includes(b.propertyName) || aProtos.includes(b.propertyName + '.prototype'))
      ) {
        return 1;
      }
      const bProtos = b.property._protos;
      if (
        bProtos &&
        a.path === 'window' &&
        (bProtos.includes(a.propertyName) || bProtos.includes(a.propertyName + '.prototype'))
      ) {
        return -1;
      }
      if (aProtos && !bProtos) return 1;
      if (bProtos && !aProtos) return -1;
      return 0;
    });

    const changes = diff.changed.map(x => {
      let pathParts = x.path.split('.');
      let propertyName: string;
      if (x.path.includes('Symbol(')) {
        const symbolSplit = x.path.split('.Symbol(');
        propertyName = symbolSplit.pop().replace(')', '');
        pathParts = symbolSplit.shift().split('.');
      } else {
        propertyName = pathParts.pop();
      }
      return {
        path: pathParts.join('.'),
        propertyName,
        property: x.lhs,
      };
    });

    const removals = diff.added
      .map(x => x.path.replace(/\.Symbol\(([\w.]+)\)/g, `[$1]`))
      .filter(
        x =>
          !x.match(/.+\._[\w()]+$/) &&
          !x.includes('.new()') &&
          !x.includes('_protos') &&
          !x.endsWith('caller') &&
          !x.endsWith('arguments'),
      );

    let orderChanges: {
      path: string;
      propertyName: string;
      prevProperty: string;
      throughProperty: string;
    }[] = [];
    for (const order of diff.order) {
      if (order.path.includes('.new()')) continue;
      const expected = order.lhs.filter(x => x[0] !== '_');
      const provided = order.rhs.filter(
        x => x[0] !== '_' && !removals.includes(order.path + '.' + x),
      );
      let prev: string = null;
      let currentPropertyChangeset: any;
      for (let i = 0; i < provided.length; i += 1) {
        const propertyName = provided[i];

        // symbols enter new part of prop order
        if (
          expected[i] !== provided[i] &&
          !propertyName.startsWith('Symbol(') &&
          !prev?.startsWith('Symbol')
        ) {
          const expectedIndex = expected.indexOf(propertyName);
          const expectedPrev = expectedIndex > 0 ? expected[expectedIndex - 1] : null;
          if (expectedPrev !== prev) {
            currentPropertyChangeset = {
              path: order.path,
              propertyName,
              throughProperty: propertyName,
              prevProperty: expectedPrev,
            };
            orderChanges.push(currentPropertyChangeset);
          } else if (currentPropertyChangeset) {
            currentPropertyChangeset.throughProperty = propertyName;
          }
        }
        prev = propertyName;
      }
    }

    // if you depend on a prev, wait for them
    // if you depend on a through, wait for them
    orderChanges.sort((a, b) => {
      if (a.path === b.path) {
        // sort so that depended upon properties are moved first
        const aHasDependency = orderChanges.some(x => x.propertyName === a.prevProperty);
        const aHasThroughDependency = orderChanges.some(x => x.throughProperty === a.prevProperty);
        const bHasDependency = orderChanges.some(x => x.propertyName === b.prevProperty);
        const bHasThroughDependency = orderChanges.some(x => x.throughProperty === b.prevProperty);
        if (aHasThroughDependency && bHasThroughDependency) {
          if (b.prevProperty === a.throughProperty) return -1;
          if (a.prevProperty === b.throughProperty) return 1;

          if (aHasDependency && bHasDependency) {
            if (a.prevProperty === b.propertyName) return 1;
            if (a.propertyName === b.prevProperty) return -1;
          }
          if (aHasThroughDependency) return 1;
          if (bHasThroughDependency) return -1;
        }
        if (aHasThroughDependency) return 1;
        if (bHasThroughDependency) return -1;
        if (aHasDependency) return 1;
        if (bHasDependency) return -1;
      }
      return a.path.localeCompare(b.path);
    });

    return {
      removals,
      additions,
      order: orderChanges,
      changes,
    };
  }
}

function get(obj: any, path: string) {
  let current = obj;
  const split = path.split('.');
  while (split.length) {
    const key = split.shift();
    const next = current[key];
    if (next) current = next;
    else if (split.length && split[0] === 'prototype') {
      current = current[key + '.prototype'];
    }
  }
  return current;
}

// INTERFACES

interface IBrowserPolyfills {
  [browserKey: string]: IBrowserPolyfill[];
}

interface IBrowserPolyfill {
  osKey: string;
  removals: string[];
  additions: { path: string; property: any; propertyName: string; prevProperty: string }[];
  order: {
    path: string;
    propertyName: string;
    prevProperty: string;
    throughProperty: string;
  }[];
  changes: { path: string; property: any; propertyName: string }[];
}
