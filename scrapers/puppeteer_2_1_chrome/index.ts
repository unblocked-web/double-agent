import puppeteer from 'puppeteer';
import runDirectiveInPuppeteer from '../puppeteer_2_0/lib/runDirectiveInPuppeteer';
import cleanPageCache from '../puppeteer_2_0/lib/cleanPageCache';
import forEachDirective from '../lib/forEachDirective';
import { basename } from 'path';

(async function() {
  const puppBrowser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ??
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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
