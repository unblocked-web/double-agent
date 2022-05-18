import { IRunnerFactory, IRunner } from '@double-agent/runner/interfaces/runner';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import RealUserAgents from '@double-agent/real-user-agents';
import ISessionPage from '@double-agent/collect/interfaces/ISessionPage';
import { Pool, Agent } from '@unblocked-web/agent';
import DefaultHumanEmulator from '@unblocked-web/default-human-emulator';
import DefaultBrowserEmulator, { IEmulatorOptions } from '@unblocked-web/default-browser-emulator';
import ChromeEngine from '@unblocked-web/agent/lib/ChromeEngine';

export default class UnblockedRunnerFactory implements IRunnerFactory {
  private pool = new Pool({
    defaultBrowserEngine: ChromeEngine.fromPackageName('@ulixee/chrome-98-0'),
    agentPlugins: [DefaultBrowserEmulator, DefaultHumanEmulator],
  });

  public runnerId(): string {
    return 'unblocked-agent';
  }

  public async startFactory(): Promise<void> {
    await this.pool.start();
  }

  public async spawnRunner(assignment: IAssignment): Promise<IRunner> {
    const agentMeta = RealUserAgents.extractMetaFromUserAgentId(assignment.userAgentId);
    const userAgentSelector = `~ ${
      agentMeta.operatingSystemName
    } = ${agentMeta.operatingSystemVersion.replace('-', '.')} & ${
      agentMeta.browserName
    } = ${agentMeta.browserVersion.replace('-0', '')}`;
    const agent = this.pool.createAgent({
      customEmulatorConfig: {
        userAgentSelector,
      } as IEmulatorOptions,
    });
    await agent.open();
    return new AgentRunner(agent);
  }

  public async stopFactory(): Promise<void> {
    await this.pool.close();
  }
}

class AgentRunner implements IRunner {
  lastPage?: ISessionPage;
  agent: Agent;

  constructor(agent: Agent) {
    this.agent = agent;
    agent.browserContext.resources.keepResourceBodies = true;
  }

  public async run(assignment: IAssignment): Promise<void> {
    console.log('--------------------------------------');
    console.log('STARTING ', assignment.id, assignment.userAgentString);
    console.log('Session ID: ', this.agent.id);
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
    sessionPages: ISessionPage[],
    counter: number,
  ): Promise<number> {
    let isFirst = true;

    const page = await this.agent.newPage();

    for (const sessionPage of sessionPages) {
      this.lastPage = sessionPage;
      const step = `[${assignment.num}.${counter}]`;
      if (sessionPage.isRedirect) continue;
      if (isFirst || sessionPage.url !== page.mainFrame.url) {
        console.log('%s GOTO -- %s', step, sessionPage.url);
        const resource = await page.goto(sessionPage.url);
        console.log('%s Waiting for statusCode -- %s', step, sessionPage.url);
        const statusCode = resource.response.statusCode;
        if (statusCode >= 400) {
          console.log(`${statusCode} ERROR: `, resource.response.buffer?.toString());
          console.log(sessionPage.url);
          process.exit();
        }
      }
      isFirst = false;
      console.log('%s waitForPaintingStable -- %s', step, sessionPage.url);
      await page.waitForLoad('PaintingStable');

      if (sessionPage.waitForElementSelector) {
        console.log('%s waitForElementSelector -- %s', step, sessionPage.waitForElementSelector);

        await wait(60e3, async () => {
          const visibility = await page.mainFrame.jsPath.getNodeVisibility([
            'document',
            ['querySelector', sessionPage.waitForElementSelector],
          ]);
          if (visibility.isVisible) return true;
        });
      }

      if (sessionPage.clickElementSelector) {
        console.log(
          '%s Wait for clickElementSelector -- %s',
          step,
          sessionPage.clickElementSelector,
        );

        await wait(30e3, async () => {
          const visibility = await page.mainFrame.jsPath.getNodeVisibility([
            'document',
            ['querySelector', sessionPage.clickElementSelector],
          ]);
          if (visibility.isVisible) return true;
        });
        console.log('%s Click -- %s', step, sessionPage.clickElementSelector);
        await page.click(sessionPage.clickElementSelector);
        await page.mainFrame.waitForLocation('change');
        console.log('%s Location Changed -- %s', step, sessionPage.url);
      }
      counter += 1;
    }

    return counter;
  }

  async stop(): Promise<void> {
    await this.agent.close();
  }
}

function wait(millis: number, callbackFn: () => Promise<boolean>): Promise<boolean> {
  const end = Date.now() + millis;

  return new Promise<boolean>(async resolve => {
    while (Date.now() <= end) {
      const isComplete = await callbackFn();
      if (isComplete) {
        resolve(true);
        return;
      }
    }
    resolve(false);
  });
}
