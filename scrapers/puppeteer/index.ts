import fetch from 'node-fetch';
import puppeteer from 'puppeteer';
import IDirective from '@double-agent/runner/lib/IDirective';

(async function() {
  let hasNext = true;
  const puppBrowser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
  });

  while (hasNext) {
    const response = await fetch('http://localhost:3000', {
      headers: {
        scraper: 'puppeteer',
      },
    });
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
      await page.goto(instruction.url, { waitUntil: 'networkidle0' });
      if (instruction.clickItemSelector) {
        console.log('clicking selector %s', instruction.clickItemSelector);
        await Promise.all([
          page.click(instruction.clickItemSelector),
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
        ]);
      }
      if (instruction.waitForElementSelector) {
        console.log('waiting for selector %s', instruction.waitForElementSelector);
        await page.waitForSelector(instruction.waitForElementSelector);
      }

      // don't wait for close
      session.close().catch();
    } else {
      console.log('------ Test Complete --------');
      break;
    }
  }
  await puppBrowser.close();
})().catch(console.log);
