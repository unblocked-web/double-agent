import puppeteer from 'puppeteer';
import runInstructionInPuppeteer from './lib/runInstructionInPuppeteer';
import cleanPageCache from './lib/cleanPageCache';
import forEachInstruction from '../lib/forEachInstruction';
import { basename } from 'path';
import IInstruction from '@double-agent/runner/interfaces/IInstruction';
import Pool from '../lib/Pool';

(async function() {
  const pool = new Pool(6, () =>
    puppeteer.launch({
      ignoreHTTPSErrors: true,
    }),
  );

  async function run(puppBrowser: puppeteer.Browser, instruction: IInstruction) {
    const page = await puppBrowser.newPage();

    await cleanPageCache(page);
    await runInstructionInPuppeteer(page, instruction);
    // don't wait for close
    page.close().catch();
  }

  try {
    await forEachInstruction(basename(__dirname), dir => pool.run(run, dir), pool.count);
  } finally {
    await pool.stop();
  }
})().catch(console.log);
