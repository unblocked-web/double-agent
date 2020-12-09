import Puppeteer from 'puppeteer';
import IAssignment from '@double-agent/runner/interfaces/IAssignment';
import runAssignmentInPuppeteer from './runAssignmentInPuppeteer';
import forEachAssignment from './forEachAssignment';
import cleanPageCache from './cleanPageCache';

(async function run() {
  const puppeteer = await Puppeteer.launch({
    // headless: false,
    ignoreHTTPSErrors: true,
    // executablePath:
    //   process.env.PUPPETEER_EXECUTABLE_PATH ??
    //   '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  const runAssignment = async (assignment: IAssignment) => {
    const session = await puppeteer.createIncognitoBrowserContext();
    const page = await session.newPage();

    await cleanPageCache(page);
    await runAssignmentInPuppeteer(page, assignment);
    page.close().catch(); // eslint-disable-line promise/valid-params
  }

  try {
    await forEachAssignment('tester', assignment => runAssignment(assignment), 1);
  } finally {
    await puppeteer.close();
  }
})().catch(console.log);
