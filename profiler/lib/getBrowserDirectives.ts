import getBrowsersToProfile, { toLooseAgent } from './getBrowsersToProfile';
import { lookup } from 'useragent';
import { agentToDirective } from '@double-agent/runner/lib/agentHelper';
import IDirective from '@double-agent/runner/lib/IDirective';
import IStatcounterOs from '../interfaces/IStatcounterOs';
import IStatcounterBrowser from '../interfaces/IStatcounterBrowser';

let browsersToProfile: { browsers: IStatcounterBrowser[]; os: IStatcounterOs[] };
export default async function getBrowserDirectives<T extends IAgented>(uniqueProfileGroups: T[]) {
  if (!browsersToProfile) {
    browsersToProfile = await getBrowsersToProfile();
  }
  const directives: {
    directive: Pick<IDirective, 'isOsTest' | 'browserGrouping' | 'useragent'>;
    profile: T;
  }[] = [];

  // run all browsers in list
  for (const browser of browsersToProfile.browsers) {
    // only run on OS differences if needed
    const matchingEntries = uniqueProfileGroups
      .map(x => {
        return {
          profile: x,
          useragents: browser.matchingUseragents(...x.useragents),
        };
      })
      .filter(x => x.useragents.length);

    for (const { useragents, profile } of matchingEntries) {
      const matchingAgent = findMatchingAgentOs(useragents, browser, browsersToProfile.os);
      if (matchingAgent && !directives.some(x => x.directive.useragent === matchingAgent)) {
        directives.push({
          profile,
          directive: agentToDirective(matchingAgent),
        });
      }
    }
  }
  return directives;
}

export async function shouldProfileUseragent(useragent: string) {
  if (!browsersToProfile) {
    browsersToProfile = await getBrowsersToProfile();
  }
  for (const browser of browsersToProfile.browsers) {
    const agentsMatchingBrowser = browser.matchingUseragents(useragent);
    if (!agentsMatchingBrowser.length) continue;
    if (findMatchingAgentOs(agentsMatchingBrowser, browser, browsersToProfile.os)) {
      return true;
    }
  }
  return false;
}

function findMatchingAgentOs(
  agentsMatchingBrowser: string[],
  browser: IStatcounterBrowser,
  operatingSystems: IStatcounterOs[],
) {
  const agents = agentsMatchingBrowser
    .map(x => {
      return {
        raw: x,
        agent: lookup(x),
      };
    })
    .sort((a, b) => {
      const osCompare = a.agent.os.family.localeCompare(b.agent.os.family);
      if (osCompare !== 0) return osCompare;
      const majorDiff = Number(b.agent.os.major) - Number(a.agent.os.major);
      if (majorDiff !== 0) return majorDiff;
      return Number(b.agent.os.minor) - Number(a.agent.os.minor);
    });

  return agents.find(x => {
    const ua = x.agent;
    for (const os of operatingSystems) {
      const looseAgent = toLooseAgent(browser, os);
      if (
        looseAgent.os.major === ua.os.major &&
        looseAgent.os.family === ua.os.family &&
        looseAgent.os.minor === ua.os.minor
      ) {
        return true;
      }
    }
    return false;
  })?.raw;
}

interface IAgented {
  useragents: string[];
}
