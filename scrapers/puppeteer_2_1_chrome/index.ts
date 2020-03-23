import puppeteer from 'puppeteer';
import runDirectiveInPuppeteer from '../puppeteer_2_0/lib/runDirectiveInPuppeteer';
import cleanPageCache from '../puppeteer_2_0/lib/cleanPageCache';
import forEachDirective from '../lib/forEachDirective';
import { basename } from 'path';
import Pool from '../lib/Pool';
import IDirective from '@double-agent/runner/interfaces/IDirective';

(async function() {
  const pool = new Pool(6, () =>
    puppeteer.launch({
      ignoreHTTPSErrors: true,
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ??
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    }),
  );

  async function run(puppBrowser: puppeteer.Browser, directive: IDirective) {
    const page = await puppBrowser.newPage();

    await cleanPageCache(page);
    await runDirectiveInPuppeteer(page, directive);
    // don't wait for close
    page.close().catch();
  }

  try {
    await forEachDirective(basename(__dirname), dir => pool.run(run, dir), pool.count);
  } finally {
    await pool.stop();
  }
})().catch(console.log);
