import { Agent } from 'secret-agent';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import ISessionPage from '@double-agent/collect/interfaces/ISessionPage';

let lastPage: ISessionPage;

export default async function runAssignmentInSecretAgent(agent: Agent, assignment: IAssignment) {
  console.log('--------------------------------------');
  console.log('STARTING ', assignment.id, assignment.userAgentString);
  console.log('Session ID: ', await agent.sessionId);
  let counter = 0;
  try {
    for (const pages of Object.values(assignment.pagesByPlugin)) {
      counter = await runPluginPages(agent, assignment, pages, counter);
    }
    console.log(`[%s.✔] FINISHED ${assignment.id}`, assignment.num);
  } catch (err) {
    console.log('[%s.x] Error on %s', assignment.num, lastPage?.url, err);
    process.exit();
  }
}

async function runPluginPages(agent: Agent, assignment: IAssignment, pages: ISessionPage[], counter: number) {
  let isFirst = true;
  for (const page of pages) {
    lastPage = page;
    const step = `[${assignment.num}.${counter}]`;
    if (page.isRedirect) {
      if (page.waitForElementSelector) {
        console.log('%s waitForElementSelector on redirect -- %s', step, page.waitForElementSelector);
        const element = agent.document.querySelector(page.waitForElementSelector);
        await agent.waitForElement(element, { waitForVisible: true, timeoutMs: 60e3 });
      }

      continue;
    }
    if (isFirst || page.url !== (await agent.url)) {
      console.log('%s GOTO -- %s', step, page.url);
      const resource = await agent.goto(page.url);
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
    await agent.waitForPaintingStable();

    if (page.waitForElementSelector) {
      console.log('%s waitForElementSelector -- %s', step, page.waitForElementSelector);
      const element = agent.document.querySelector(page.waitForElementSelector);
      await agent.waitForElement(element, { waitForVisible: true, timeoutMs: 60e3 });
    }

    if (page.clickElementSelector) {
      console.log('%s Wait for clickElementSelector -- %s', step, page.clickElementSelector);
      const clickable = agent.document.querySelector(page.clickElementSelector);
      await agent.waitForElement(clickable, { waitForVisible: true });
      console.log('%s Click -- %s', step, page.clickElementSelector);
      await agent.click(clickable);
      await agent.waitForLocation('change');
      console.log('%s Location Changed -- %s', step, page.url);
    }
    counter += 1;
  }

  return counter;
}
