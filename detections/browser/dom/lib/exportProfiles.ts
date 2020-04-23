import 'source-map-support/register';
import fs from 'fs';
import DomProfile from './DomProfile';
import deepDiff, { IObjectComparison } from './deepDiff';
import IDomProfile from '../interfaces/IDomProfile';
import {
  isAllowedToBeMissing,
  isAllowedValueDifference,
  isWebdriverProp,
} from '../checks/domMatch';

const pluginDir = process.env.PLUGIN_DIR ?? `${__dirname}/../.plugins/`;

const basePolyfillPath = process.env.BASE_POLYFILL ?? null;

export default async function exportProfiles() {
  if (!fs.existsSync(pluginDir)) {
    throw new Error(
      "FATAL: plugin directory doesn't exist!! This export only fills plugin folders that are listed in this directory",
    );
  }
  let targetProfile: IDomProfile;
  if (basePolyfillPath) {
    targetProfile = DomProfile.read(`${__dirname}/../dumps/${basePolyfillPath}`);
  }
  const plugins = fs.readdirSync(pluginDir);
  const browsers: string[] = [];
  const browserPluginPaths: { [browser: string]: string } = {};

  for (const plugin of plugins) {
    if (!plugin.startsWith('emulate')) continue;
    const [browser, version] = plugin.split('-').slice(1);

    browsers.push([browser, version].join('_'));
    browserPluginPaths[[browser, version].join('_')] = [pluginDir, plugin].join('/');
  }

  const browserNavigators: { [browser: string]: { os: string; navigator: any }[] } = {};
  const browserChromes: {
    [browser: string]: { os: string; chrome: any; prevProperty: string }[];
  } = {};

  const browserPolyfills: {
    [browser: string]: {
      os: string;
      removals: string[];
      additions: { path: string; property: any; propertyName: string; prevProperty: string }[];
      order: {
        path: string;
        propertyName: string;
        prevProperty: string;
        throughProperty: string;
      }[];
      changes: { path: string; property: any; propertyName: string }[];
    }[];
  } = {};

  const profilePaths = DomProfile.filepaths;
  for (const profilePath of profilePaths) {
    const browser = browsers.find(x => profilePath.includes(x));
    if (!browser) continue;

    const profile = DomProfile.read(profilePath);
    const os = profilePath
      .split('__')
      .shift()
      .split('/')
      .pop();
    if (!browserNavigators[browser]) browserNavigators[browser] = [];
    if (!browserChromes[browser]) browserChromes[browser] = [];
    browserNavigators[browser].push({
      os,
      navigator: profile.dom.window.navigator,
    });
    if (profile.dom.window.chrome) {
      const keys = Object.keys(profile.dom.window);
      const index = keys.indexOf('chrome');
      const prevProperty = keys[index - 1];
      browserChromes[browser].push({
        os,
        chrome: profile.dom.window.chrome,
        prevProperty,
      });
    }
    if (targetProfile) {
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

      if (diff.added.length || diff.changed.length || diff.missing.length || diff.order.length) {
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
            const aHasThroughDependency = orderChanges.some(
              x => x.throughProperty === a.prevProperty,
            );
            const bHasDependency = orderChanges.some(x => x.propertyName === b.prevProperty);
            const bHasThroughDependency = orderChanges.some(
              x => x.throughProperty === b.prevProperty,
            );
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

        if (!browserPolyfills[browser]) browserPolyfills[browser] = [];
        browserPolyfills[browser].push({
          os,
          removals,
          additions,
          order: orderChanges,
          changes,
        });
      }
    }
  }

  for (const browserName of browsers) {
    const navigators = browserNavigators[browserName];
    const firstNavigator = navigators[0].navigator;
    for (const entry of navigators.slice(1)) {
      const navigatorDiff = deepDiff(firstNavigator, entry.navigator);
      if (navigatorDiff.added.length) {
        console.log(
          'WARN: Browser navigator has added props for this OS',
          browserName,
          entry.os,
          navigatorDiff.added,
        );
      }
      if (navigatorDiff.missing.length) {
        console.log(
          'WARN: Browser navigator has removed props for this OS',
          browserName,
          entry.os,
          navigatorDiff.missing,
        );
      }
    }
    const chromes = browserChromes[browserName] ?? [];
    const firstChrome = chromes[0];
    for (const entry of chromes.slice(1)) {
      if (entry.prevProperty !== firstChrome.prevProperty) {
        console.log(
          'WARN: Browser chrome has different prev property by os',
          browserName,
          entry.os,
          entry.prevProperty,
          firstChrome.prevProperty,
        );
      }
      const diff = deepDiff(firstChrome.chrome, entry.chrome);
      if (diff.added.length) {
        console.log(
          'WARN: Browser chrome has added props for this OS',
          browserName,
          entry.os,
          diff.added,
        );
      }
      if (diff.missing.length) {
        console.log(
          'WARN: Browser chrome has removed props for this OS',
          browserName,
          entry.os,
          diff.missing,
        );
      }
    }

    const polys = browserPolyfills[browserName] ?? [];
    const firstPoly = polys[0];
    delete firstPoly.os;
    const finalPolys = [firstPoly];
    for (const entry of polys.slice(1)) {
      const addDiff = deepDiff(firstPoly.additions, entry.additions);
      if (hasChanges(addDiff)) {
        finalPolys.push(entry);
        continue;
      }
      const removalDiff = deepDiff(firstPoly.removals, entry.removals);
      if (hasChanges(removalDiff)) {
        finalPolys.push(entry);
        continue;
      }
      const orderDiff = deepDiff(firstPoly.order, entry.order);
      if (hasChanges(orderDiff)) {
        finalPolys.push(entry);
        continue;
      }
      const changedDiff = deepDiff(firstPoly.changes, entry.changes);
      if (hasChanges(changedDiff)) {
        finalPolys.push(entry);
      }
    }
    const base = browserPluginPaths[browserName];
    for (const poly of finalPolys) {
      const polyfillName = poly.os ? `_${poly.os}` : '';
      fs.writeFileSync(
        `${base}/polyfill${polyfillName}.json`,
        JSON.stringify(poly, null, 2),
        'utf8',
      );
    }
  }

  for (const browserName of browsers) {
    const navigators = browserNavigators[browserName];
    const chromes = browserChromes[browserName];

    const base = browserPluginPaths[browserName];
    if (navigators.length) {
      fs.writeFileSync(`${base}/navigator.json`, JSON.stringify(navigators[0], null, 2), 'utf8');
    }
    if (chromes.length) {
      fs.writeFileSync(`${base}/chrome.json`, JSON.stringify(chromes[0], null, 2), 'utf8');
    }
  }
}

function hasChanges(diff: IObjectComparison) {
  return diff.added.length || diff.order.length || diff.changed.length || diff.missing.length;
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
