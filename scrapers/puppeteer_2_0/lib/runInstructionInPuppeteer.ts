import IInstruction from '@double-agent/runner/interfaces/IInstruction';
import puppeteer from 'puppeteer';

export default async function runInstructionInPuppeteer(
  page: puppeteer.Page,
  instruction: IInstruction,
  setUseragent = true,
) {
  if (setUseragent === true) {
    await page.setUserAgent(instruction.useragent);
  }

  for (const instrPage of instruction.pages) {
    if (instrPage.url !== page.url()) {
      await page.goto(instrPage.url, { waitUntil: 'networkidle0' });
    }
    if (instrPage.waitForElementSelector) {
      console.log('waiting for selector %s', instrPage.waitForElementSelector);
      await page.waitForSelector(instrPage.waitForElementSelector);
    }
    if (instrPage.clickSelector) {
      console.log('clicking selector %s', instrPage.clickSelector);
      await Promise.all([
        page.click(instrPage.clickSelector),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ]);
    }
  }
}
