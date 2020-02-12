import * as util from 'util';
import getDefaultHeaderOrder from './getDefaultHeaderOrder';
import { headerCaseTest } from './generateXhrTests';
import Profile from './Profile';

export default function getBrowserProfileStats(https = false) {
  const statsByResourceType: {
    [type: string]: { [order: string]: { browsers: string[]; urls: string[] } };
  } = {};

  // check urls across os
  const statsByUrl: {
    [url: string]: { [order: string]: string[] };
  } = {};

  const statsByBrowserVersion: IStatsByBrowserVersion = {};

  const profileType = https ? 'https' : 'http';
  for (const profile of Profile.getAllProfiles(profileType)) {
    for (const entry of profile.cleanedEntries) {
      const { defaultKeys, rawOrder } = getDefaultHeaderOrder(entry.headers);
      const defaultKeysOrder = defaultKeys.join(',');
      const customHeaderOrder = rawOrder.join(',');

      if (!statsByResourceType[entry.type]) {
        statsByResourceType[entry.type] = {};
      }
      const statEntry = statsByResourceType[entry.type];
      let record = statEntry[defaultKeysOrder];
      const agentGrouping = profile.agentGrouping;

      if (!record) {
        record = { browsers: [agentGrouping], urls: [entry.path] };
        statEntry[defaultKeysOrder] = record;
      } else {
        if (!record.urls.includes(entry.path)) {
          record.urls.push(entry.path);
        }
        if (!record.browsers.includes(agentGrouping)) {
          record.browsers.push(agentGrouping);
        }
      }

      if (!statsByUrl[entry.path]) {
        statsByUrl[entry.path] = {};
      }
      if (!statsByUrl[entry.path][defaultKeysOrder]) {
        statsByUrl[entry.path][defaultKeysOrder] = [];
      }
      if (!statsByUrl[entry.path][defaultKeysOrder].includes(agentGrouping)) {
        statsByUrl[entry.path][defaultKeysOrder].push(agentGrouping);
      }

      const browserVersion = profile.browserAndVersion;
      if (!statsByBrowserVersion[browserVersion]) {
        statsByBrowserVersion[browserVersion] = {};
      }
      let browserRequestType = statsByBrowserVersion[browserVersion][entry.type];
      if (!browserRequestType) {
        browserRequestType = {
          defaultHeaderOrders: [],
          customHeaderOrders: [],
          customHeaderCasing: null,
          defaults: {},
          samples: 0,
        };
        statsByBrowserVersion[browserVersion][entry.type] = browserRequestType;
      }
      browserRequestType.samples += 1;
      if (!browserRequestType.defaultHeaderOrders.includes(defaultKeysOrder)) {
        browserRequestType.defaultHeaderOrders.push(defaultKeysOrder);
      }
      if (!browserRequestType.customHeaderOrders.includes(customHeaderOrder)) {
        browserRequestType.customHeaderOrders.push(customHeaderOrder);
      }
      const caseTest = customHeaderOrder.split(',').find(x => x.match(RegExp(headerCaseTest, 'i')));
      if (caseTest) {
        browserRequestType.customHeaderCasing =
          caseTest === headerCaseTest
            ? 'preserve'
            : caseTest === headerCaseTest.toLowerCase()
            ? 'lower'
            : 'title';
      }
      for (const key of entry.rawHeaders) {
        const [name, ...value] = key.split('=');
        if (defaultKeys.includes(name)) {
          if (!browserRequestType.defaults[name]) {
            browserRequestType.defaults[name] = [];
          }
          if (!browserRequestType.defaults[name].includes(value.join('=')))
            browserRequestType.defaults[name].push(value.join('='));
        }
      }
    }
  }

  const hasMultipleOrders: { [resourceType: string]: string[] } = {};
  for (const [type, orders] of Object.entries(statsByResourceType)) {
    for (const [, value] of Object.entries(orders)) {
      for (const browser of value.browsers) {
        const browserOnly = browser.split('__').pop();
        const otherOrders = Object.entries(orders).filter(([, x]) => x.browsers.includes(browser));
        if (otherOrders.length > 1) {
          if (!hasMultipleOrders[type]) hasMultipleOrders[type] = [];
          if (!hasMultipleOrders[type].includes(browserOnly)) {
            hasMultipleOrders[type].push(browserOnly);
          }
        }
      }
    }
  }

  if (process.env.PRINT) {
    console.log(
      'Resource Type Header Order Varies',
      util.inspect(hasMultipleOrders, false, null, true),
    );
    console.log('Stats by Resource Type', util.inspect(statsByResourceType, false, null, true));
    console.log('Stats by Browser Version', util.inspect(statsByBrowserVersion, false, null, true));
  }
  return {
    statsByType: statsByResourceType,
    statsByBrowserVersion,
  };
}

export interface IStatsByBrowserVersion {
  [browser: string]: {
    [type: string]: IHeaderStats;
  };
}

export interface IHeaderStats {
  samples: number;
  defaultHeaderOrders: string[];
  customHeaderOrders: string[];
  customHeaderCasing: 'lower' | 'preserve' | 'title';
  defaults: {
    [header: string]: string[];
  };
}
