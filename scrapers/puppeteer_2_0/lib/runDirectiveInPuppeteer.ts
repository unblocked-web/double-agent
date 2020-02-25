import IDirective from '@double-agent/runner/lib/IDirective';
import puppeteer from 'puppeteer';

export default async function runDirectiveInPuppeteer(page: puppeteer.Page, instruction: IDirective, setUseragent = true) {
  if (setUseragent === true) {
    await page.setUserAgent(instruction.useragent);
  }
  await page.goto(instruction.url, { waitUntil: 'networkidle0' });
  if (instruction.clickItemSelector) {
    console.log('clicking selector %s', instruction.clickItemSelector);
    await Promise.all([
      page.click(instruction.clickItemSelector),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
  }

  if (instruction.requiredFinalClickSelector) {
    console.log('clicking final selector %s', instruction.requiredFinalClickSelector);
    await Promise.all([
      page.click(instruction.requiredFinalClickSelector),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
  }

  if (instruction.waitForElementSelector) {
    console.log('waiting for selector %s', instruction.waitForElementSelector);
    await page.waitForSelector(instruction.waitForElementSelector);
  }
}
