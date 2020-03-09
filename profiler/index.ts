import 'source-map-support/register';
import IDirective from '@double-agent/runner/interfaces/IDirective';
import Queue from 'p-queue';
import fetch from 'node-fetch';
import getBrowsersToProfile from './lib/getBrowsersToProfile';
import BrowserStack from './lib/BrowserStack';
import runDirectiveInWebDriver, { createNewWindow } from './lib/runDirectiveInWebDriver';
import IBrowserstackAgent from './interfaces/IBrowserstackAgent';

const runnerDomain = 'a1.ulixee.org';

(async () => {
  const queue = new Queue({ concurrency: 5 });

  const browsersToProfile = await getBrowsersToProfile(1, 3);
  for (const { browser: browserName, version: browser_version } of browsersToProfile.browsers) {
    if (browserName === 'IE') continue; // no support for Promises, lambdas... detections need refactor for support

    for (const { os, version: os_version } of browsersToProfile.os) {
      const agent = {
        browserName,
        browser_version,
        os,
        os_version,
      };

      const isSupported = await BrowserStack.isBrowserSupported(agent);
      if (!isSupported) {
        console.log("BrowserStack doesn't support agent", agent);
        continue;
      }

      queue.add(getRunnerForAgent(agent));
    }
  }
  await queue.onEmpty();
})();

function getRunnerForAgent(agent: IBrowserstackAgent) {
  return async () => {
    const response = await fetch(`http://${runnerDomain}:3000/create`, {
      headers: {
        scraper: 'profiler',
      },
    });
    const json = await response.json();
    const directive = json?.directive as IDirective;
    console.log('Next agent [%s]', agent);

    const times = 1;
    // const times = directive.hits ?? 1;
    const driver = await BrowserStack.buildWebDriver(agent);

    const startUrl = `http://${runnerDomain}:3000/directive.html?scraper=profiler&sessionid=${directive.sessionid}`;
    try {
      for (let i = 0; i < times; i += 1) {
        await runDirectiveInWebDriver(driver, startUrl, directive, agent.browserName);
        if (times > 1) {
          await createNewWindow(driver);
        }
      }
    } finally {
      await driver.quit();
    }
  };
}
