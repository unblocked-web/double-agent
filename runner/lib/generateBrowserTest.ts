import { getIntoliUseragents, getStatcounterUseragents, IUseragentPercents } from './userAgentUtils';

export default async function generateBrowserTest(browsersPerTest: number, topXBrowsers: number) {
  const topBrowsers = await getStatcounterUseragents(topXBrowsers);
  const intoliBrowsers = getIntoliUseragents(browsersPerTest);
  return {
    intoliBrowsers,
    topBrowsers,
  } as IBrowsersToTest;
}

export interface IBrowsersToTest {
  intoliBrowsers: IUseragentPercents[];
  topBrowsers: IUseragentPercents[];
}

