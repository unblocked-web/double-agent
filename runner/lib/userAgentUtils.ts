import { existsSync, promises as fs } from 'fs';
import getAllDetectors from './getAllDetectors';
import getBrowsersToProfile, { osToAgentOs } from '@double-agent/profiler/lib/getBrowsersToProfile';
import { Agent, lookup, OperatingSystem } from 'useragent';
import UserAgent from 'user-agents';
import { sum, sumValues } from './utils';

export async function getStatcounterUseragents(
  topXBrowsers: number = 2,
): Promise<IUseragentPercents[]> {
  const { browsers, os } = await getBrowsersToProfile();

  const agentOsMapping = os.map(x => ({
    agentOs: osToAgentOs(x),
    percent: x.averagePercent,
  }));

  const agentStrings = await getKnownUseragentStrings();
  const top2Browsers = browsers.slice(0, topXBrowsers).map(x => {
    return {
      family: x.browser,
      major: x.version.split('.').shift(),
      percent: x.averagePercent,
    };
  });

  const totalBrowserPercent = sum(top2Browsers.map(x => x.percent));

  // find useragent strings from our profiles
  const agentStringsToUse = agentStrings
    .map(agentstring => {
      const agent = lookup(agentstring);
      const agentMatch = top2Browsers.find(
        x => x.family === agent.family && x.major === agent.major,
      );
      if (agentMatch) {
        return {
          useragent: agentstring,
          browserPercent: agentMatch.percent / totalBrowserPercent,
          agent,
        };
      }
      return null;
    })
    .filter(Boolean);

  const getOsKey = (os: OperatingSystem) => `${os.family} ${os.major}.${os.minor}`;
  const getBrowserKey = (agent: Agent) => `${agent.family} ${agent.major}`;

  // what's the breakdown of each browser by the OS's we got profiles for (eg, Safari 13 only works on OSX 10_15)
  const osByAgent: { [agent: string]: { [os: string]: number } } = {};
  for (const { agent } of agentStringsToUse) {
    const browserKey = getBrowserKey(agent);
    if (!osByAgent[browserKey]) osByAgent[browserKey] = {};

    const os = agent.os;
    const osValue = agentOsMapping.find(
      x =>
        x.agentOs.family === os.family &&
        x.agentOs.major === os.major &&
        x.agentOs.minor === os.minor,
    );
    osByAgent[browserKey][getOsKey(agent.os)] = osValue.percent;
  }

  // figure out what percent of traffic each browser + os should represent
  return agentStringsToUse.map(entry => {
    const browserKey = getBrowserKey(entry.agent);
    const osBreakdown = osByAgent[browserKey];

    const osKey = getOsKey(entry.agent.os);

    const osPercentTotal = sumValues(osBreakdown);
    const percentOfOsTraffic = osBreakdown[osKey] / osPercentTotal;

    return {
      percent: Math.floor(100 * entry.browserPercent * percentOfOsTraffic),
      useragent: entry.useragent,
    };
  });
}

export function getIntoliUseragents(count: number): IUseragentPercents[] {
  const userAgent = new UserAgent({ deviceCategory: 'desktop' });
  const allAgents = Array(count)
    .fill('')
    .map(() => userAgent.random())
    .map(x => x.data.userAgent);

  const countByAgent: { [agent: string]: number } = {};
  for (const agent of allAgents) {
    if (!countByAgent[agent]) countByAgent[agent] = 0;
    countByAgent[agent] += 1;
  }

  return Object.entries(countByAgent).map(([useragent, browserCount]) => {
    return {
      useragent,
      percent: Math.floor((100 * browserCount) / count),
    };
  });
}

export function isAgent(agent: Agent, browser: string, major: number) {
  return agent.family === browser && agent.major === String(major);
}

async function getKnownUseragentStrings() {
  const detectorDirs = getAllDetectors().map(x => x.dir);
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

export interface IUseragentPercents {
  useragent: string;
  percent: number;
}
