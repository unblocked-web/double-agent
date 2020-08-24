import * as Fs from 'fs';
import HeaderProfile from '@double-agent/http-headers/lib/HeaderProfile';
import getDefaultHeaderOrder from '@double-agent/http-headers/lib/getDefaultHeaderOrder';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';
import emulators from '../emulators.json';

const browserKeys: string[] = emulators.map(x => x.key);

const emulationsDir = process.env.PLUGIN_DIR ?? `${__dirname}/../data/emulations`;

export default async function exportHeaderProfiles() {
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
    const profileDirName = getProfileDirNameFromUseragent(profile.useragent);
    const browserKey = browserKeys.find(x => profileDirName.includes(x));
    if (!browserKey) {
      console.log(`-- SKIPPING ${profileDirName}`);
      continue;
    }

    if (!profilesByBrowser[browserKey]) profilesByBrowser[browserKey] = {};
    const browserEntry = profilesByBrowser[browserKey];

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

  for (const [browserKey, profile] of Object.entries(profilesByBrowser)) {
    const emulationName = browserKey.toLowerCase().replace('_', '-');
    const basePath = emulationsDir + `/emulate-${emulationName}`;
    if (!Fs.existsSync(basePath)) Fs.mkdirSync(basePath, { recursive: true });
    Fs.writeFileSync(basePath + '/headers.json', JSON.stringify(profile, null, 2));
  }
}
