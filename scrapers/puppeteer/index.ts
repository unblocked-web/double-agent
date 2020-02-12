import fetch from 'node-fetch';
import puppeteer from 'puppeteer';
import { inspect } from 'util';
import IDirective from '@double-agent/runner/lib/IDirective';
import { writeFileSync } from 'fs';
import IDetectionResultset from '@double-agent/runner/lib/IDetectionResultset';

(async function() {
  let hasNext = true;
  const puppBrowser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
  });

  while (hasNext) {
    const response = await fetch('http://localhost:3000');
    const json = await response.json();
    if (json.directive) {
      const instruction = json.directive as IDirective;

      console.log(
        'Next directive %s [%s]',
        instruction.module ?? instruction.url,
        instruction.useragent,
      );

      const session = await puppBrowser.createIncognitoBrowserContext();
      const page = await session.newPage();
      await page.setUserAgent(instruction.useragent);
      await page.goto(instruction.url, { waitUntil: 'load' });
      if (instruction.clickItemSelector) {
        console.log('clicking selector %s', instruction.clickItemSelector);
        await page.click(instruction.clickItemSelector);
      }
      if (instruction.waitForElementSelector) {
        console.log('waiting for selector %s', instruction.waitForElementSelector);
        await page.waitForSelector(instruction.waitForElementSelector);
      }

      // don't wait for close
      session.close().catch();
    } else {
      console.log('\n\n--------------------\n\nResults', inspect(json, false, null, true));
      for (const test of json.output as IDetectionResultset[]) {
        writeFileSync(
          `results/${test.category}-${test.testName}.json`,
          JSON.stringify(test.results, null, 2),
        );
      }
      break;
    }
  }
  await puppBrowser.close();
})().catch(console.log);
