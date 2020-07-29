import IAssignment from '../interfaces/IAssignment';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import { URL } from 'url';
import BrowsersToTest, { IBrowserToTestAgent } from '@double-agent/profiler/lib/BrowsersToTest';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';

export default async function getAllAssignments(
  httpDomains: IDetectionDomains,
  httpsDomains: IDetectionDomains,
  browsersToTest: BrowsersToTest,
) {
  const assignments: IAssignment[] = [];

  browsersToTest.majority.forEach(browserToTest => {
    browserToTest.agents.forEach(agent => {
      const assignment = buildAssignment(
        assignments.length,
        httpDomains,
        httpsDomains,
        agent,
        false,
      );
      assignments.push(assignment);
    })
  });

  browsersToTest.intoli.forEach(browserToTest => {
    browserToTest.agents.forEach(agent => {
      const assignment = buildAssignment(
        assignments.length,
        httpDomains,
        httpsDomains,
        agent,
        true,
      );
      assignments.push(assignment);
    })
  });

  return assignments;
}

export function buildAssignment(
  assignmentId: number,
  httpDomains: IDetectionDomains,
  httpsDomains: IDetectionDomains,
  agent: IBrowserToTestAgent = null,
  isIntoliUseragent = false,
) {
  const profileDirName = agent ? getProfileDirNameFromUseragent(agent.useragent) : null;
  return {
    id: assignmentId,
    useragent: agent?.useragent,
    percentOfTraffic: agent?.usagePercent,
    profileDirName: profileDirName,
    testType: isIntoliUseragent ? 'intoli' : 'topBrowsers',
    pages: [
      {
        url: httpsDomains.main.href,
        clickSelector: '#goto-run-page',
        clickDestinationUrl: new URL('/run', httpsDomains.main).href,
      },
      {
        url: new URL('/run-page', httpsDomains.external).href,
        clickSelector: '#goto-results-page',
        clickDestinationUrl: new URL('/results', httpsDomains.external).href,
      },
      {
        url: new URL('/results-page', httpsDomains.main).href,
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
  } as IAssignment;
}
