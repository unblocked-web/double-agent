import puppeteer from 'puppeteer';
import runAssignmentInPuppeteer from '../puppeteer_2_0/lib/runAssignmentInPuppeteer';
import forEachAssignment from '../lib/forEachAssignment';
import { basename } from 'path';

(async function() {
  const puppBrowser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
  });

  await forEachAssignment(basename(__dirname), async assignment => {
    const session = await puppBrowser.createIncognitoBrowserContext();
    const page = await session.newPage();

    await runAssignmentInPuppeteer(page, assignment);
    // don't wait for close
    session.close().catch();
  });
  await puppBrowser.close();
})().catch(console.log);
