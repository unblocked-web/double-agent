import IDirective from '../interfaces/IDirective';
import { getUseragentPath } from './profileHelper';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import { IBrowsersToTest } from './generateBrowserTest';
import { IUseragentPercents } from './userAgentUtils';

export default async function getAllDirectives(
  httpDomains: IDetectionDomains,
  httpsDomains: IDetectionDomains,
  browsersToTest: IBrowsersToTest,
) {
  const topBrowserDirectives = browsersToTest.topBrowsers.map(agentDistribution =>
    buildDirective(
      httpDomains,
      httpsDomains,
      false,
      agentDistribution,
      getUseragentPath(agentDistribution.useragent),
    ),
  );

  const intoliDirectives = browsersToTest.intoliBrowsers.map(agentDistribution =>
    buildDirective(
      httpDomains,
      httpsDomains,
      true,
      agentDistribution,
      getUseragentPath(agentDistribution.useragent),
    ),
  );

  return topBrowserDirectives.concat(intoliDirectives);
}

export function buildDirective(
  httpDomains: IDetectionDomains,
  secureDomains: IDetectionDomains,
  isIntoliUseragent = false,
  agentDistribution?: IUseragentPercents,
  browserGrouping?: string,
) {
  return {
    useragent: agentDistribution?.useragent,
    percentOfTraffic: agentDistribution?.percent,
    browserGrouping,
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
      },
    ],
    sessionid: '',
  } as IDirective;
}
