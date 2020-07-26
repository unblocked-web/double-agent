import puppeteer from 'puppeteer';
import runAssignmentInPuppeteer from '../puppeteer_2_0/lib/runAssignmentInPuppeteer';
import cleanPageCache from '../puppeteer_2_0/lib/cleanPageCache';
import forEachAssignment from '../lib/forEachAssignment';
import { basename } from 'path';
import Pool from '../lib/Pool';
import IAssignment from '@double-agent/runner/interfaces/IAssignment';

(async function() {
  const pool = new Pool(6, () =>
    puppeteer.launch({
      ignoreHTTPSErrors: true,
    }),
  );

  async function run(puppBrowser: puppeteer.Browser, assignment: IAssignment) {
    const page = await puppBrowser.newPage();

    await cleanPageCache(page);
    await runAssignmentInPuppeteer(page, assignment);
    // don't wait for close
    page.close().catch();
  }

  try {
    await forEachAssignment(basename(__dirname), dir => pool.run(run, dir), pool.count);
  } finally {
    await pool.stop();
  }
})().catch(console.log);
