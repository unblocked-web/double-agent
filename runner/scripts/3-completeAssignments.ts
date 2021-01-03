import * as Path from 'path';
import Puppeteer from 'puppeteer';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import runAssignmentInPuppeteer from '../lib/runAssignmentInPuppeteer';
import cleanPuppeteerPageCache from '../lib/cleanPuppeteerPageCache';
import forEachAssignment from '../lib/forEachAssignment';

(async function run() {
  const puppeteer = await Puppeteer.launch({
    // headless: false,
    ignoreHTTPSErrors: true,
  });

  const runAssignment = async (assignment: IAssignment) => {
    const session = await puppeteer.createIncognitoBrowserContext();
    const page = await session.newPage();

    await cleanPuppeteerPageCache(page);
    await runAssignmentInPuppeteer(page, assignment);
    page.close().catch(); // eslint-disable-line promise/valid-params
  }

  try {
    const config = { userId: 'testing', dataDir: Path.resolve(__dirname, '../data/3-completed-assignments')};
    await forEachAssignment(config, assignment => runAssignment(assignment));
  } finally {
    await puppeteer.close();
  }
})().catch(console.log);
