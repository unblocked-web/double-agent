import puppeteer from 'puppeteer';
import runInstructionInPuppeteer from '../puppeteer_2_0/lib/runInstructionInPuppeteer';
import forEachInstruction from '../lib/forEachInstruction';
import { basename } from 'path';

(async function() {
  const puppBrowser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
  });

  await forEachInstruction(basename(__dirname), async instruction => {
    const session = await puppBrowser.createIncognitoBrowserContext();
    const page = await session.newPage();

    await runInstructionInPuppeteer(page, instruction);
    // don't wait for close
    session.close().catch();
  });
  await puppBrowser.close();
})().catch(console.log);
