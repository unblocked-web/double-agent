import 'source-map-support/register';
import IDirective from '@double-agent/runner/interfaces/IDirective';
import Queue from 'p-queue';
import fetch from 'node-fetch';
import BrowserStack from './lib/BrowserStack';
import runDirectiveInWebDriver, { createNewWindow } from './lib/runDirectiveInWebDriver';
import IBrowserstackAgent from './interfaces/IBrowserstackAgent';
import { WebDriver } from 'selenium-webdriver';
import ProfilerData from './data';
import Browsers from './lib/Browsers';
import Oses from './lib/Oses';
import { getProfileDirName } from './index';

const runnerDomain = 'a1.ulixee.org';
const drivers: WebDriver[] = [];

process.on('exit', () => {
  drivers.forEach(x => x.quit());
});

(async () => {
  const browsers = new Browsers();
  const oses = new Oses();
  const queue = new Queue({ concurrency: 5 });
  for (const browser of browsers.toArray()) {
    if (browser.name === 'IE' || (browser.name === 'Chrome' && Number(browser.version.major) < 58)) {
      // no support for Promises, lambdas... detections need refactor for support
      console.log("DoubleAgent doesn't support", browser.key);
      continue;
    }
    for (const browserOs of Object.values(browser.byOsKey)) {
      if (!browserOs.hasBrowserStackSupport) {
        console.log("BrowserStack doesn't support", browser.key, browserOs.key);
        continue;
      }
      const os = oses.getByKey(browserOs.key);
      const profileDirName = getProfileDirName(os, browser);

      if (ProfilerData.profileDirNames.includes(profileDirName)) {
        console.log('Profile exists', profileDirName);
        continue;
      }

      const browserStackAgent = BrowserStack.createAgent(browser, os);
      queue.add(getRunnerForAgent(browserStackAgent));
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
    } catch (error) {
      console.log(error);
    } finally {
      const idx = drivers.indexOf(driver);
      if (idx >= 0) drivers.splice(idx, 1);
      await driver.quit();
    }
  };
}
