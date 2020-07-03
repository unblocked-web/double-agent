import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import IDomProfile from '../interfaces/IDomProfile';
import { flaggedCheckFromRequest } from '@double-agent/runner/lib/flagUtils';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';
import deepDiff, { IDiff } from '../lib/deepDiff';

const debug = process.env.DEBUG ?? false;

export default function domMatch(
  ctx: IRequestContext,
  profile: IDomProfile,
  browserProfile: IDomProfile,
) {
  const baseCheck = flaggedCheckFromRequest(
    ctx,
    'browser',
    'Dom Features Match Version',
  ) as IFlaggedCheck;
  baseCheck.description =
    'Checks that the full scope of a property matches, including values, types, invocation, and proto hierarchy';
  const comparison = deepDiff(browserProfile.dom, profile.dom);

  console.log('Session %s, DOM comparison complete (pre-filtering)', ctx.session.id, {
    added: comparison.added.length,
    missing: comparison.missing.length,
    changed: comparison.changed.length,
    matches: comparison.same.length,
    order: comparison.order.length,
  });

  for (const diff of comparison.order) {
    const { path, lhs, rhs } = diff;

    const check = {
      ...baseCheck,
      checkName: `Dom Property Key Order Matches: ${path}`,
      description:
        'Checks that the order of properties matches the default browser. Overriding properties and/or different rendering engines underneath can alter this order and is a sign of modifications.',
      pctBot: 100,
    };

    check.value = rhs;
    check.expected = lhs;
    if (debug) {
      let i = 0;
      for (; i < lhs.length; i += 1) {
        if (lhs[i] !== rhs[i]) break;
      }
      console.log('Dom Diff (order after differences) %s', path, lhs.slice(i), rhs.slice(i));
    }

    ctx.session.recordCheck(true, check);
  }

  for (const diff of comparison.missing) {
    const { path, lhs, rhs } = diff;

    const check = {
      ...baseCheck,
      checkName: `Dom Property Matches (missing): ${path}`,
      pctBot: 95,
    };

    if (isAllowedToBeMissing(path)) continue;

    check.expected = lhs;
    if (debug) console.log('Dom Diff (missing) %s', path, lhs, rhs);

    if (path.includes('window.chrome')) {
      check.pctBot = 99;
    }
    if (path.includes('VideoPlaybackQuality')) {
      check.pctBot = 100;
    }

    ctx.session.recordCheck(true, check);
  }

  for (const diff of comparison.changed) {
    if (isAllowedValueDifference(diff)) continue;
    const { path, lhs, rhs } = diff;
    const check = {
      ...baseCheck,
      checkName: `Dom Property Matches (changed): ${path}`,
      pctBot: 95,
    };

    check.value = rhs;
    check.expected = lhs;
    if (debug) console.log('Dom Diff (value): %s. Value %s vs %s', path, lhs, rhs);
    ctx.session.recordCheck(true, check, true);
  }

  for (const diff of comparison.added) {
    const { path, rhs } = diff;
    const check = {
      ...baseCheck,
      checkName: `Dom Property Matches (added): ${path}`,
      pctBot: 95,
    };

    check.value = rhs;
    check.pctBot = 75; // could be from installed plugins and other things

    if (debug) console.log('Dom Diff (extra): %s', path, rhs);
    ctx.session.recordCheck(true, check, true);
  }

  const propertyCheck = {
    checkName: `Dom Property Matches: *`,
    category: baseCheck.category,
    layer: baseCheck.layer,
    count: 1,
  };
  ctx.session.checks.push(propertyCheck);

  for (const path of comparison.same) {
    // Profiles generated from BrowserStack include webdriver properties, thus why they are marked "same".
    // If webdriver props are present, high likelihood of bot!
    if (isWebdriverProp(path)) {
      ctx.session.recordCheck(
        true,
        {
          ...baseCheck,
          pctBot: 99,
          checkName: 'Webdriver DOM Properties are Present',
          description:
            "Webdriver makes some changes to the DOM are a high indication automation is occurring if they're present",
          value: path,
        },
        true,
      );
      if (debug) console.log('Dom Diff (webdriver present) %s', path);
    } else {
      // skip creating a full flag check (this list can get 70k long)
      propertyCheck.count += 1;
    }
  }
}

export function isAllowedToBeMissing(prop: string) {
  // only case for now
  return isWebdriverProp(prop);
}

export function isAllowedValueDifference(diff: IDiff) {
  const { path, lhs, rhs } = diff;
  if (!path.endsWith('_value') && !path.endsWith('_invocation')) {
    return false;
  }

  const isTypeSame = typeof lhs === typeof rhs;
  if (!isTypeSame) {
    return false;
  }
  const itemType = typeof lhs;

  if (itemType === 'number') {
    // if they're diff values of same length, chalk up to different runs
    if (String(lhs).length === String(rhs).length) {
      return true;
    }
    // if decimal points, allow 2 decimal digits diff (often rounding won't include trailing 0s)
    if (String(lhs).includes('.') && Math.abs(String(lhs).length - String(rhs).length) <= 2) {
      return true;
    }
    if (allowedNumberValueDifferences.some(x => x.test(path))) {
      return true;
    }
  }

  if (itemType === 'string') {
    if (path.includes('.stack._value')) {
      const shouldIgnore =
        (lhs as string).split('\n').shift() === ((rhs as unknown) as string).split('\n').shift();
      if (shouldIgnore) return true;
    }
    if (allowedStringValueDifferences.some(x => x.test(path))) {
      return true;
    }
  }

  if (itemType === 'boolean') {
    if (allowedBoolDifferences.some(x => x.test(path))) {
      return true;
    }
  }
}

const allowedStringValueDifferences = [
  new RegExp('uri', 'i'),
  new RegExp('url', 'i'),
  new RegExp('href', 'i'),
  new RegExp('location', 'i'),
  new RegExp('location.port', 'i'),
  new RegExp('domain', 'i'),
  new RegExp('referrer', 'i'),
  new RegExp('navigator.appVersion'),
  new RegExp('navigator.userAgent'),
  new RegExp('id._value'),
  new RegExp(/AudioContext.*state._value/),
  new RegExp('Document.new.+lastModified'),
];

const allowedNumberValueDifferences = [
  new RegExp('width', 'i'),
  new RegExp('height', 'i'),
  new RegExp('top', 'i'),
  new RegExp('left', 'i'),
  new RegExp('scroll', 'i'),
  new RegExp('memory.usedJSHeapSize._value'),
  new RegExp('performance.timing.secureConnectionStart'), // this value can be 0 if no secure connection is made, which is somewhat load/timing dependent
  new RegExp('screen[XY]'),
  new RegExp('pageT'),
  // new RegExp('window.chrome.loadTimes.new.+._value'),
  new RegExp('AudioContext.new.+.baseLatency._value'),
  new RegExp('navigator.connection.*._value'),
  new RegExp(/AudioContext.+currentTime/), //can be 0 if stop gets triggered by dom perusal
  new RegExp('window.Math.random._invocation'),
];

const allowedBoolDifferences = [
  new RegExp('window.navigator.userActivation.+'), // indicates user has done some activity
  new RegExp('loadTimes.+wasNpnNegotiated'), // depends on user connection
  new RegExp('window.find'), // this seems to be returning true on webdriver, but not in a real browser
];

export function isWebdriverProp(prop: string) {
  return (
    webdriverProps.has(prop) ||
    prop.startsWith('window.document.$cdc_') ||
    prop.includes('.getDestinationInsertionPoints')
  );
}

const webdriverProps = new Set([
  'window.navigator.webdriver',
  'window.Navigator.prototype.webdriver',
  'window.Element.prototype.createShadowRoot',
  'window.Document.prototype.registerElement',
  'detached.clearStale',
  'detached.isNodeReachable_',
]);
