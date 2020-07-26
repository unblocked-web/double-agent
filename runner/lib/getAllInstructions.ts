import IInstruction from '../interfaces/IInstruction';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import { URL } from 'url';
import BrowsersToTest, { IBrowserToTestAgent } from '@double-agent/profiler/lib/BrowsersToTest';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';

export default async function getAllInstructions(
  httpDomains: IDetectionDomains,
  httpsDomains: IDetectionDomains,
  browsersToTest: BrowsersToTest,
) {
  const instructions = [];

  browsersToTest.majority.forEach(browserToTest => {
    browserToTest.agents.forEach(agent => {
      const instruction = buildInstruction(
        httpDomains,
        httpsDomains,
        agent,
        false,
      );
      instructions.push(instruction);
    })
  });

  browsersToTest.intoli.forEach(browserToTest => {
    browserToTest.agents.forEach(agent => {
      const instruction = buildInstruction(
        httpDomains,
        httpsDomains,
        agent,
        true,
      );
      instructions.push(instruction);
    })
  });

  return instructions;
}

export function buildInstruction(
  httpDomains: IDetectionDomains,
  secureDomains: IDetectionDomains,
  agent: IBrowserToTestAgent = null,
  isIntoliUseragent = false,
) {
  const profileDirName = agent ? getProfileDirNameFromUseragent(agent.useragent) : null;
  return {
    useragent: agent?.useragent,
    percentOfTraffic: agent?.usagePercent,
    profileDirName: profileDirName,
    testType: isIntoliUseragent ? 'intoli' : 'topBrowsers',
    pages: [
      {
        url: secureDomains.main.href,
        clickSelector: '#goto-run-page',
        clickDestinationUrl: new URL('/run', secureDomains.main).href,
      },
      {
        url: new URL('/run-page', secureDomains.external).href,
        clickSelector: '#goto-results-page',
        clickDestinationUrl: new URL('/results', secureDomains.external).href,
      },
      {
        url: new URL('/results-page', secureDomains.main).href,
        waitForElementSelector: 'body.ready',
      },
      {
        url: httpDomains.main.href,
        clickSelector: '#goto-run-page',
        clickDestinationUrl: new URL('/run', httpDomains.main).href,
      },
      {
        url: new URL('/run-page', httpDomains.external).href,
        clickSelector: '#goto-results-page',
        clickDestinationUrl: new URL('/results', httpDomains.external).href,
      },
      {
        url: new URL('/results-page', httpDomains.main).href,
        waitForElementSelector: 'body.ready',
      },
    ],
    sessionid: '',
  } as IInstruction;
}
