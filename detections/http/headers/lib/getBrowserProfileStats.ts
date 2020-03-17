import * as util from 'util';
import getDefaultHeaderOrder from './getDefaultHeaderOrder';
import { headerCaseTest } from './generateXhrTests';
import HeaderProfile from './HeaderProfile';
import { getUseragentPath } from '@double-agent/runner/lib/profileHelper';
import OriginType from '@double-agent/runner/interfaces/OriginType';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';

export default function getBrowserProfileStats() {
  const statsByResourceType: {
    [type: string]: { [order: string]: { browsers: string[]; urls: string[] } };
  } = {};

  // check urls across os
  const statsByUrl: {
    [url: string]: { [order: string]: string[] };
  } = {};

  const statsByBrowserVersion: IStatsByBrowserVersion = {};

  for (const profile of HeaderProfile.getAllProfiles()) {
    for (const entry of profile.requests) {
      const { defaultKeys, rawOrder } = getDefaultHeaderOrder(entry.headers);
      const defaultKeysOrder = defaultKeys.join(',');
      const customHeaderOrder = rawOrder.join(',');

      const key = getStatsKey(
        entry.secureDomain,
        entry.originType,
        entry.resourceType,
        entry.method
      );

      if (!statsByResourceType[key]) {
        statsByResourceType[key] = {};
      }
      const statEntry = statsByResourceType[key];
      let record = statEntry[defaultKeysOrder];
      const agentGrouping = getUseragentPath(profile.useragent);

      if (!record) {
        record = { browsers: [agentGrouping], urls: [entry.url] };
        statEntry[defaultKeysOrder] = record;
      } else {
        if (!record.urls.includes(entry.url)) {
          record.urls.push(entry.url);
        }
        if (!record.browsers.includes(agentGrouping)) {
          record.browsers.push(agentGrouping);
        }
      }

      if (!statsByUrl[entry.url]) {
        statsByUrl[entry.url] = {};
      }
      if (!statsByUrl[entry.url][defaultKeysOrder]) {
        statsByUrl[entry.url][defaultKeysOrder] = [];
      }
      if (!statsByUrl[entry.url][defaultKeysOrder].includes(agentGrouping)) {
        statsByUrl[entry.url][defaultKeysOrder].push(agentGrouping);
      }

      const browserVersion = agentGrouping.split('__').pop();
      if (!statsByBrowserVersion[browserVersion]) {
        statsByBrowserVersion[browserVersion] = {};
      }
      let browserRequestType = statsByBrowserVersion[browserVersion][key];
      if (!browserRequestType) {
        browserRequestType = {
          defaultHeaderOrders: [],
          customHeaderOrders: [],
          customHeaderCasing: null,
          defaults: {},
          samples: 0,
        };
        statsByBrowserVersion[browserVersion][key] = browserRequestType;
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
      for (const key of entry.headers) {
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

export function getStatsKey(
  secureDomain: boolean,
  originType: OriginType,
  resourceType: ResourceType,
  method: string = 'GET'
) {
  const origin = typeof originType === 'string' ? originType : OriginType[originType];
  const resource = typeof resourceType === 'string' ? resourceType : ResourceType[resourceType];

  return [secureDomain ? 'Secure' : '', origin, resource, method].filter(Boolean).join(' ');
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