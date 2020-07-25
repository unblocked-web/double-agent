import IInstruction from '../interfaces/IInstruction';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import { URL } from 'url';
import BrowsersToTest, { IBrowserToTestTest } from '@double-agent/profiler/lib/BrowsersToTest';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';

export default async function getAllInstructions(
  httpDomains: IDetectionDomains,
  httpsDomains: IDetectionDomains,
  browsersToTest: BrowsersToTest,
) {
  const instructions = [];

  browsersToTest.majority.forEach(browserToTest => {
    browserToTest.tests.forEach(browserTest => {
      const instruction = buildInstruction(
        httpDomains,
        httpsDomains,
        browserTest,
        false,
      );
      instructions.push(instruction);
    })
  });

  browsersToTest.intoli.forEach(browserToTest => {
    browserToTest.tests.forEach(browserTest => {
      const instruction = buildInstruction(
        httpDomains,
        httpsDomains,
        browserTest,
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
  browserTest: IBrowserToTestTest = null,
  isIntoliUseragent = false,
) {
  const profileDirName = browserTest ? getProfileDirNameFromUseragent(browserTest.useragent) : null;
  return {
    useragent: browserTest?.useragent,
    percentOfTraffic: browserTest?.usagePercent,
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
