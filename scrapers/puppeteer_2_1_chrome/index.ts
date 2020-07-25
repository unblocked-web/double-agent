import puppeteer from 'puppeteer';
import runInstructionInPuppeteer from '../puppeteer_2_0/lib/runInstructionInPuppeteer';
import cleanPageCache from '../puppeteer_2_0/lib/cleanPageCache';
import forEachInstruction from '../lib/forEachInstruction';
import { basename } from 'path';
import Pool from '../lib/Pool';
import IInstruction from '@double-agent/runner/interfaces/IInstruction';

(async function() {
  const pool = new Pool(6, () =>
    puppeteer.launch({
      ignoreHTTPSErrors: true,
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ??
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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
