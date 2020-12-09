/* eslint-disable no-console */
import IAssignment from '@double-agent/runner/interfaces/IAssignment';
import puppeteer from 'puppeteer';
import ISessionPage from '@double-agent/collect/interfaces/ISessionPage';

export default async function runAssignmentInPuppeteer(
  puppPage: puppeteer.Page,
  assignment: IAssignment,
  setUserAgentString = true,
) {
  if (setUserAgentString === true) {
    await puppPage.setUserAgent(assignment.userAgentString);
  }

  let pageCount = 0;
  for (const pages of Object.values(assignment.pagesByPlugin)) {
    await runPagesInPuppeteer(pages, puppPage);
    pageCount += pages.length;
  }
  console.log(''.padEnd(100, '-'));
  console.log(`RAN ${pageCount} pages`);
  console.log(''.padEnd(100, '-'));
}

async function runPagesInPuppeteer(pages: ISessionPage[], puppPage: puppeteer.Page) {
  for (const page of pages) {
    console.log(''.padEnd(100, '-'));
    console.log(`RUNNING: `, page);
    if (page.isRedirect) continue;
    if (page.url !== puppPage.url()) {
      console.log('- goto ', page.url);
      await puppPage.goto(page.url, { waitUntil: 'networkidle0' });
    }
    if (page.waitForElementSelector) {
      console.log('- waiting for selector %s', page.waitForElementSelector);
      await puppPage.waitForSelector(page.waitForElementSelector);
    }
    if (page.clickElementSelector) {
      console.log('- clicking selector %s', page.clickElementSelector);
      await Promise.all([
        puppPage.click(page.clickElementSelector),
        puppPage.waitForNavigation({ waitUntil: 'networkidle0' }),
      ]);
    }
  }
}
