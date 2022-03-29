import { IRunner, IRunnerFactory } from '@double-agent/runner/interfaces/runner';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import ISessionPage from '@double-agent/collect/interfaces/ISessionPage';

import puppeteer from 'puppeteer';

export default class PuppeteerRunnerFactory implements IRunnerFactory {
  browser?: puppeteer.Browser;

  public runnerId(): string {
      return 'puppeteer';
  }

  public async startFactory() {
    this.browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
    });
  }

  public async spawnRunner(assignment: IAssignment): Promise<IRunner> {
    const session = await this.browser.createIncognitoBrowserContext();
    const page = await session.newPage();
    await page.setUserAgent(assignment.userAgentString);
    return new PuppeteerRunner(page);
  }

  public async stopFactory() {
    await this.browser.close();
  }
}

class PuppeteerRunner implements IRunner {
  lastPage?: ISessionPage;
  page: puppeteer.Page;

  constructor(page: puppeteer.Page) {
    this.page = page;
  }

  public async run(assignment: IAssignment) {
    console.log('--------------------------------------');
    console.log('STARTING ', assignment.id, assignment.userAgentString);
    let counter = 0;
    try {
      for (const pages of Object.values(assignment.pagesByPlugin)) {
        counter = await this.runPluginPages(assignment, pages, counter);
      }
      console.log(`[%s.✔] FINISHED ${assignment.id}`, assignment.num);
    } catch (err) {
      console.log('[%s.x] Error on %s', assignment.num, this.lastPage?.url, err);
      process.exit();
    }
  }

  async runPluginPages(
    assignment: IAssignment,
    pages: ISessionPage[],
    counter: number,
  ) {
    let isFirst = true;
    for (const page of pages) {
      this.lastPage = page;
      const step = `[${assignment.num}.${counter}]`;
      if (page.isRedirect) continue;
      if (isFirst || page.url !== this.page.url()) {
        console.log('%s GOTO -- %s', step, page.url);
        const response = await this.page.goto(page.url, {
          waitUntil: 'domcontentloaded',
        });
        console.log('%s Waiting for statusCode -- %s', step, page.url);
        const statusCode = await response.status();
        if (statusCode >= 400) {
          console.log(`${statusCode} ERROR: `, await response.text());
          console.log(page.url);
          process.exit();
        }
      }
      isFirst = false;

      if (page.waitForElementSelector) {
        console.log('%s waitForElementSelector -- %s', step, page.waitForElementSelector);
        await this.page.waitForSelector(page.waitForElementSelector, {
          visible: true,
          timeout: 60e3
        });
      }

      if (page.clickElementSelector) {
        console.log('%s Wait for clickElementSelector -- %s', step, page.clickElementSelector);
        const clickable = await this.page.waitForSelector(page.clickElementSelector, {
          visible: true
        });
        console.log('%s Click -- %s', step, page.clickElementSelector);
        await clickable.click();
        await this.page.waitForNavigation();
        console.log('%s Location Changed -- %s', step, page.url);
      }
      counter += 1;
    }

    return counter;
  }

  async stop() {
    await this.page.close();
  }
}
