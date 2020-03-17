import IDirective from '../interfaces/IDirective';
import DetectionsServer from '../server/DetectionsServer';
import { getUseragentPath } from './profileHelper';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import { IBrowserTest } from './generateBrowserTest';

export default async function getAllDirectives(
  detectionsServer: DetectionsServer,
  browserTest: IBrowserTest,
) {
  const topBrowserDirectives = browserTest.topBrowsers.map(useragent =>
    buildDirective(
      detectionsServer.httpDomains,
      detectionsServer.httpsDomains,
      false,
      useragent,
      getUseragentPath(useragent),
    ),
  );

  const intoliDirectives = browserTest.intoliBrowsers.map(useragent =>
    buildDirective(
      detectionsServer.httpDomains,
      detectionsServer.httpsDomains,
      true,
      useragent,
      getUseragentPath(useragent),
    ),
  );

  return topBrowserDirectives.concat(intoliDirectives);
}

export function buildDirective(
  httpDomains: IDetectionDomains,
  secureDomains: IDetectionDomains,
  isIntoliUseragent = false,
  useragent?: string,
  browserGrouping?: string,
) {
  return {
    useragent,
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
