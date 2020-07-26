import IAssignment from '@double-agent/runner/interfaces/IAssignment';
import puppeteer from 'puppeteer';

export default async function runAssignmentInPuppeteer(
  page: puppeteer.Page,
  assignment: IAssignment,
  setUseragent = true,
) {
  if (setUseragent === true) {
    await page.setUserAgent(assignment.useragent);
  }

  for (const instrPage of assignment.pages) {
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
