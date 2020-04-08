import HeaderProfile from './HeaderProfile';
import getDefaultHeaderOrder from './getDefaultHeaderOrder';
import { lookup } from 'useragent';
import fs from 'fs';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';

const pluginDir = process.env.PLUGIN_DIR ?? `${__dirname}/../.plugins/`;

export default async function exportProfiles() {
  const profiles = HeaderProfile.getAllProfiles();
  const profilesByBrowser: {
    [browser: string]: {
      [resource: string]: {
        originTypes: string[];
        method: string;
        secureDomain: boolean;
        order: string[];
        defaults: { [header: string]: string[] };
      }[];
    };
  } = {};
  for (const profile of profiles) {
    const ua = lookup(profile.useragent);
    const browser = ua.family + '_' + ua.major;
    if (!profilesByBrowser[browser]) profilesByBrowser[browser] = {};
    const browserEntry = profilesByBrowser[browser];

    for (const entry of profile.requests) {
      const { defaultKeys } = getDefaultHeaderOrder(entry.headers);
      let resourceType = entry.resourceType;
      if (entry.url.includes('/fetch') && entry.method !== 'OPTIONS') {
        resourceType = ResourceType.Fetch;
      }
      if (resourceType === ResourceType.Redirect) {
        resourceType = ResourceType.Document;
      }
      const resourceList = browserEntry[resourceType] || [];
      if (!browserEntry[resourceType]) browserEntry[resourceType] = resourceList;

      const existing = resourceList.find(
        x =>
          x.method === entry.method &&
          x.secureDomain === entry.secureDomain &&
          x.order.toString() === defaultKeys.toString(),
      );

      const defaults = {};
      for (const key of defaultKeys) {
        if (
          (key.match(/^sec-/i) && !key.match(/-key/i)) ||
          key.match(/^accept/i) ||
          key.match(/^connection/i) ||
          key.match(/^upgrade/i)
        ) {
          const value = entry.headers.find(x => x.startsWith(key + '='))?.split('=') ?? [];
          value.shift();
          defaults[key] = [value.join('=')];
        }
      }
      if (!existing) {
        resourceList.push({
          originTypes: [entry.originType],
          secureDomain: entry.secureDomain,
          method: entry.method,
          order: defaultKeys,
          defaults,
        });
      } else {
        if (!existing.originTypes.includes(entry.originType)) {
          existing.originTypes.push(entry.originType);
        }

        for (const [key, value] of Object.entries(defaults)) {
          if (!existing.defaults[key]) existing.defaults[key] = [];
          if (!existing.defaults[key].includes(value[0])) {
            existing.defaults[key].push(value[0]);
          }
        }
      }
    }
  }

  for (const [browser, profile] of Object.entries(profilesByBrowser)) {
    const base = pluginDir + `/emulate-${browser.toLowerCase().replace('_', '-')}`;
    if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
    fs.writeFileSync(base + '/headers.json', JSON.stringify(profile, null, 2));
  }
}
