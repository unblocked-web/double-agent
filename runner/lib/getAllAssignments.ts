import IAssignment from '../interfaces/IAssignment';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import { URL } from 'url';
import BrowsersToTest, {
  IBrowserToTestPickType,
  IBrowserToTestUsagePercent
} from '@double-agent/profiler/lib/BrowsersToTest';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';

export default async function getAllAssignments(
  httpDomains: IDetectionDomains,
  httpsDomains: IDetectionDomains,
  browsersToTest: BrowsersToTest,
) {
  const assignments: IAssignment[] = [];
  browsersToTest.all.forEach(browserToTest => {
    const browserStackUseragent = browserToTest.useragents.find(x => x.sources.includes('BrowserStack'));
    const assignment = buildAssignment(
      assignments.length,
      httpDomains,
      httpsDomains,
      browserStackUseragent ? browserStackUseragent.string : browserToTest.useragents[0].string,
      browserToTest.usagePercent,
      browserToTest.pickType,
    );
    assignments.push(assignment);
  });

  return assignments;
}

export function buildAssignment(
  assignmentId: number,
  httpDomains: IDetectionDomains,
  httpsDomains: IDetectionDomains,
  useragent: string = null,
  usagePercent: IBrowserToTestUsagePercent = null,
  pickType: IBrowserToTestPickType = [],
) {
  const profileDirName = useragent ? getProfileDirNameFromUseragent(useragent) : null;
  return {
    id: assignmentId,
    useragent: useragent,
    pickType: pickType,
    usagePercent: usagePercent,
    profileDirName: profileDirName,
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
    sessionId: '',
  } as IAssignment;
}
