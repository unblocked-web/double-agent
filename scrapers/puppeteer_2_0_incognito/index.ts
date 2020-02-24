import puppeteer from 'puppeteer';
import runDirectiveInPuppeteer from '../puppeteer_2_0/lib/runDirectiveInPuppeteer';
import forEachDirective from '../lib/forEachDirective';
import { basename } from 'path';

(async function() {
  const puppBrowser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
  });

  await forEachDirective(basename(__dirname), async directive => {
    const session = await puppBrowser.createIncognitoBrowserContext();
    const page = await session.newPage();

    await runDirectiveInPuppeteer(page, directive);
    // don't wait for close
    session.close().catch();
  });
  await puppBrowser.close();
})().catch(console.log);
