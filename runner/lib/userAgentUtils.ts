import { existsSync, promises as fs } from 'fs';
import getAllDetectors from './getAllDetectors';
import getBrowsersToProfile from '@double-agent/profiler/lib/getBrowsersToProfile';
import { Agent, lookup } from 'useragent';
import UserAgent from 'user-agents';

export async function getStatcounterUseragents(topXBrowsers: number = 2, stringsCount: number) {
  const { browsers } = await getBrowsersToProfile();

  const agentStrings = await getKnownUseragentStrings();
  const top2Browsers = browsers.slice(0, topXBrowsers).map(x => {
    return {
      family: x.browser,
      major: x.version.split('.').shift(),
    };
  });

  const agentStringsToUse = agentStrings.filter(agentstring => {
    const agent = lookup(agentstring);
    return top2Browsers.some(x => x.family === agent.family && x.major === agent.major);
  });

  return agentStringsToUse;
}

export function getIntoliUseragents(count: number) {
  const userAgent = new UserAgent({ deviceCategory: 'desktop' });
  return Array(count)
    .fill('')
    .map(() => userAgent.random())
    .map(x => x.data.userAgent)
    .reduce((list, item) => {
      if (!list.includes(item)) list.push(item);
      return list;
    }, []);
}

export function isAgent(agent: Agent, browser: string, major: number) {
  return agent.family === browser && agent.major === String(major);
}

async function getKnownUseragentStrings() {
  const detectorDirs = getAllDetectors(false).map(x => x.dir);
  const agentStrings = new Set<string>();
  for (const detectorDir of detectorDirs) {
    if (!existsSync(`${detectorDir}/profiles`)) continue;
    for (const profilePath of await fs.readdir(`${detectorDir}/profiles`)) {
      if (!profilePath.endsWith('.json')) continue;
      const contents = await fs.readFile(`${detectorDir}/profiles/${profilePath}`, 'utf8');
      const record = JSON.parse(contents);
      const useragent = record.useragent;
      if (useragent) agentStrings.add(useragent);
    }
  }
  return [...agentStrings];
}
