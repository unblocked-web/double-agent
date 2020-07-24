import IDirective from '../interfaces/IDirective';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import { URL } from 'url';
import BrowsersToTest, { IBrowserToTestTest } from '@double-agent/profiler/lib/BrowsersToTest';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';

export default async function getAllDirectives(
  httpDomains: IDetectionDomains,
  httpsDomains: IDetectionDomains,
  browsersToTest: BrowsersToTest,
) {
  const directives = [];

  browsersToTest.majority.forEach(browserToTest => {
    browserToTest.tests.forEach(browserTest => {
      const directive = buildDirective(
        httpDomains,
        httpsDomains,
        browserTest,
        false,
      );
      directives.push(directive);
    })
  });

  browsersToTest.intoli.forEach(browserToTest => {
    browserToTest.tests.forEach(browserTest => {
      const directive = buildDirective(
        httpDomains,
        httpsDomains,
        browserTest,
        true,
      );
      directives.push(directive);
    })
  });

  return directives;
}

export function buildDirective(
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
  } as IDirective;
}
