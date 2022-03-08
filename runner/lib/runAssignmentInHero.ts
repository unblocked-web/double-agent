import Hero from '@ulixee/hero-fullstack';
import Core from '@ulixee/hero-core';
import { IRunnerFactory, IRunner } from '../interfaces/runner';
import IAssignment from '@double-hero/collect-controller/interfaces/IAssignment';
import RealUserAgents from '@double-agent/real-user-agents';
import ISessionPage from '@double-hero/collect/interfaces/ISessionPage';

class HeroRunnerFactory implements IRunnerFactory {
  public async startFactory() {
    await Core.start();
  }

  public async spawnRunner(assignment: IAssignment): Promise<IRunner> {
    const agentMeta = RealUserAgents.extractMetaFromUserAgentId(assignment.userAgentId);
    const hero = new Hero({
      userAgent: `~ ${agentMeta.operatingSystemName} = ${agentMeta.operatingSystemVersion.replace(
        '-',
        '.',
      )} & ${agentMeta.browserName} = ${agentMeta.browserVersion.replace('-0', '')}`,
    });
    return new HeroRunner(hero);
  }

  public async stopFactory() {
    return;
  }
}

class HeroRunner implements IRunner {
  lastPage?: ISessionPage;
  hero: Hero;

  constructor(hero: Hero) {
    this.hero = hero;
  }

  public async run(assignment: IAssignment) {
    console.log('--------------------------------------');
    console.log('STARTING ', assignment.id, assignment.userAgentString);
    console.log('Session ID: ', await this.hero.sessionId);
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
      if (isFirst || page.url !== (await this.hero.url)) {
        console.log('%s GOTO -- %s', step, page.url);
        const resource = await this.hero.goto(page.url);
        console.log('%s Waiting for statusCode -- %s', step, page.url);
        const statusCode = await resource.response.statusCode;
        if (statusCode >= 400) {
          console.log(`${statusCode} ERROR: `, await resource.response.text());
          console.log(page.url);
          process.exit();
        }
      }
      isFirst = false;
      console.log('%s waitForPaintingStable -- %s', step, page.url);
      await this.hero.waitForPaintingStable();

      if (page.waitForElementSelector) {
        console.log('%s waitForElementSelector -- %s', step, page.waitForElementSelector);
        const element = this.hero.document.querySelector(page.waitForElementSelector);
        await this.hero.waitForElement(element, { waitForVisible: true, timeoutMs: 60e3 });
      }

      if (page.clickElementSelector) {
        console.log('%s Wait for clickElementSelector -- %s', step, page.clickElementSelector);
        const clickable = this.hero.document.querySelector(page.clickElementSelector);
        await this.hero.waitForElement(clickable, { waitForVisible: true });
        console.log('%s Click -- %s', step, page.clickElementSelector);
        await this.hero.click(clickable);
        await this.hero.waitForLocation('change');
        console.log('%s Location Changed -- %s', step, page.url);
      }
      counter += 1;
    }

    return counter;
  }

  async stop() {
    await this.hero.close();
  }
}

export { HeroRunnerFactory };
