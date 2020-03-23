import puppeteer from 'puppeteer';
import runDirectiveInPuppeteer from './lib/runDirectiveInPuppeteer';
import cleanPageCache from './lib/cleanPageCache';
import forEachDirective from '../lib/forEachDirective';
import { basename } from 'path';
import IDirective from '@double-agent/runner/interfaces/IDirective';
import Pool from '../lib/Pool';

(async function() {
  const pool = new Pool(6, () =>
    puppeteer.launch({
      ignoreHTTPSErrors: true,
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
