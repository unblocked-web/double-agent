import puppeteer from 'puppeteer';
import runDirectiveInPuppeteer from './lib/runDirectiveInPuppeteer';
import cleanPageCache from './lib/cleanPageCache';
import forEachDirective from '../lib/forEachDirective';
import { basename } from 'path';

(async function() {
  const puppBrowser = await puppeteer.launch({
    ignoreHTTPSErrors: true
  });

  await forEachDirective(basename(__dirname), async directive => {
    const page = await puppBrowser.newPage();

    await cleanPageCache(page);
    await runDirectiveInPuppeteer(page, directive);
    // don't wait for close
    page.close().catch();
  });
  await puppBrowser.close();
})().catch(console.log);
