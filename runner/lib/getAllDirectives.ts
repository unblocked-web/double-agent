import IDirective from '../interfaces/IDirective';
import DetectionsServer from '../server/DetectionsServer';
import { getUseragentPath } from './useragentProfileHelper';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import { getIntoliUseragents, getStatcounterUseragents } from './userAgentUtils';

export default async function getAllDirectives(detectionsServer: DetectionsServer) {
  const top2BrowserAgents = await getStatcounterUseragents(2, 10);
  const topBrowserDirectives = top2BrowserAgents.map(useragent =>
    buildDirective(
      detectionsServer.httpDomains,
      detectionsServer.httpsDomains,
      false,
      useragent,
      getUseragentPath(useragent),
    ),
  );

  const intoliDirectives = getIntoliUseragents(10).map(useragent =>
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
      },
      {
        url: new URL('/run-page', secureDomains.external).href,
        clickSelector: '#goto-results-page',
      },
      {
        url: new URL('/results-page', secureDomains.main).href,
      },
      {
        url: httpDomains.main.href,
        clickSelector: '#goto-run-page',
      },
      {
        url: new URL('/run-page', httpDomains.external).href,
        clickSelector: '#goto-results-page',
      },
      {
        url: new URL('/results-page', httpDomains.main).href,
      },
    ],
    sessionid: '',
  } as IDirective;
}
