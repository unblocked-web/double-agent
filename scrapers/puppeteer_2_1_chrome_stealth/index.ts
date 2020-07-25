import runInstructionInPuppeteer from '../puppeteer_2_0/lib/runInstructionInPuppeteer';
import cleanPageCache from '../puppeteer_2_0/lib/cleanPageCache';
import forEachInstruction from '../lib/forEachInstruction';
import { basename } from 'path';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgentOverride from 'puppeteer-extra-plugin-stealth/evasions/user-agent-override';
import { lookup } from 'useragent';
import Pool from '../lib/Pool';
import IInstruction from '@double-agent/runner/interfaces/IInstruction';
import { Browser } from 'puppeteer';

(async function() {
  const stealth = StealthPlugin();
  stealth.enabledEvasions.delete('user-agent-override');
  puppeteer.use(stealth);
  const ua = UserAgentOverride({
    locale: 'en-US,en',
  });
  puppeteer.use(ua);
  const pool = new Pool<Browser>(6, () => {
    return puppeteer.launch({
      ignoreHTTPSErrors: true,
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ??
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    }) as Promise<Browser>;
  });

  async function run(puppBrowser: Browser, instruction: IInstruction) {
    const useragent = lookup(instruction.useragent);
    ua.opts.userAgent = instruction.useragent;
    ua.opts.platform = useragent.os.family === 'Windows' ? 'Win32' : 'MacIntel';

    const page = await puppBrowser.newPage();

    await cleanPageCache(page);
    await runInstructionInPuppeteer(page, instruction, false);
    // don't wait for close
    page.close().catch();
  }

  try {
    await forEachInstruction(basename(__dirname), dir => pool.run(run, dir), pool.count);
  } finally {
    await pool.stop();
  }
})().catch(console.log);
