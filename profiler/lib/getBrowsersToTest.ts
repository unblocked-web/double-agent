import getBrowsersToProfile, { osToAgentOs } from './getBrowsersToProfile';
import IUseragentPercents from "../interfaces/IUseragentPercents";
import { Agent, lookup, OperatingSystem } from 'useragent';
import UserAgent from 'user-agents';
import IBrowsersToTest from "../interfaces/IBrowsersToTest";
import getKnownUseragentStrings from './getKnownUseragentStrings';

const intoliBrowserCount = 50;
const topBrowserCount = 2;

export default async function getBrowsersToTest() {
  const topBrowsers = await getStatcounterUseragents(topBrowserCount);
  const intoliBrowsers = getIntoliUseragents(intoliBrowserCount);
  return {
    intoliBrowsers,
    topBrowsers,
  } as IBrowsersToTest;
}

async function getStatcounterUseragents(
    topXBrowsers: number = 2,
): Promise<IUseragentPercents[]> {
  const { browsers, os } = await getBrowsersToProfile();

  const agentOsMapping = os.map(x => ({
    agentOs: osToAgentOs(x),
    percent: x.averagePercent,
  }));

  const agentStrings = getKnownUseragentStrings();
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

function getIntoliUseragents(count: number): IUseragentPercents[] {
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

function sum(numbers: number[]) {
  return numbers.reduce((a, b) => a + b, 0);
}

function sumValues(object: { [key: string]: number }) {
  return sum(Object.values(object));
}
