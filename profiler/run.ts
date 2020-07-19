import 'source-map-support/register';
import IDirective from '@double-agent/runner/interfaces/IDirective';
import Queue from 'p-queue';
import fetch from 'node-fetch';
import getBrowsersToProfile, { toAgentKey } from './lib/getBrowsersToProfile';
import BrowserStack from './lib/BrowserStack';
import runDirectiveInWebDriver, { createNewWindow } from './lib/runDirectiveInWebDriver';
import IBrowserstackAgent from './interfaces/IBrowserstackAgent';
import { WebDriver } from 'selenium-webdriver';
import ProfilerData from './data';

const runnerDomain = 'a1.ulixee.org';
const drivers: WebDriver[] = [];

process.on('exit', () => {
  drivers.forEach(x => x.quit());
});

(async () => {
  const queue = new Queue({ concurrency: 5 });
  const browsersToProfile = await getBrowsersToProfile(0.5, 3);
  for (const browserToProfile of browsersToProfile.browsers) {
    const { browser: browserName, version: browser_version } = browserToProfile;
    if (browserName === 'IE' || (browserName === 'Chrome' && browser_version === '49.0')) continue; // no support for Promises, lambdas... detections need refactor for support

    for (const osToProfile of browsersToProfile.os) {
      const { os, version: os_version } = osToProfile;
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
      const agentKey = toAgentKey(browserToProfile, osToProfile);

      // check if profile exists
      if (ProfilerData.agentKeys.includes(agentKey)) {
        console.log('Profile already exists', agentKey);
        continue;
      }

      queue.add(getRunnerForAgent(agent));
    }
  }
  await queue.onIdle();
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
    console.log('Running agent [%s]', agent);

    const times = 1;
    // const times = directive.hits ?? 1;
    const driver = await BrowserStack.buildWebDriver(agent);
    drivers.push(driver);
    try {
      for (let i = 0; i < times; i += 1) {
        await runDirectiveInWebDriver(driver, directive, agent.browserName, agent.browser_version);
        if (times > 1) {
          await createNewWindow(driver);
        }
      }
    } finally {
      const idx = drivers.indexOf(driver);
      if (idx >= 0) drivers.splice(idx, 1);
      await driver.quit();
    }
  };
}
