import { getIntoliUseragents, getStatcounterUseragents } from './userAgentUtils';

export default async function generateBrowserTest(browsersPerTest: number, topXBrowsers: number) {
  const topBrowsers = await getStatcounterUseragents(topXBrowsers, browsersPerTest);
  const intoliBrowsers = getIntoliUseragents(browsersPerTest);
  return {
    intoliBrowsers,
    topBrowsers,
  } as IBrowserTest;
}

export interface IBrowserTest {
  intoliBrowsers: string[];
  topBrowsers: string[];
}
