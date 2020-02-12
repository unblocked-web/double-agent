import * as webdriver from 'selenium-webdriver';
import { until, WebDriver } from 'selenium-webdriver';
import Queue from 'p-queue';

const browsers = [
  ['Chrome', '80.0'],
  ['Chrome', '79.0'],
  ['Chrome', '78.0'],
  ['Chrome', '77.0'],
  ['Chrome', '76.0'],
  ['Chrome', '75.0'],
  ['Chrome', '74.0'],
  ['Chrome', '73.0'],
  ['Chrome', '72.0'],
  ['Chrome', '71.0'],
  ['Chrome', '70.0'],
  ['Firefox', '72.0'],
  ['Firefox', '71.0'],
  ['Firefox', '70.0'],
  ['Firefox', '69.0'],
  ['Firefox', '68.0'],
  ['Firefox', '67.0'],
  ['Firefox', '66.0'],
  ['Firefox', '65.0'],
  ['Edge', '18.0'],
  ['Edge', '17.0'],
].reverse();

const operatingSystems = [
  ['Windows', '10'],
  ['Windows', '7'],
  ['OS X', 'Catalina'],
  ['OS X', 'Yosemite'],
];

(async function run() {
  const queue = new Queue({ concurrency: 1 });
  for (const [browserName, browserv] of browsers) {
    for (const [os, osv] of operatingSystems) {
      queue.add(async () => {
        console.log('Running %s %s on %s %s', browserName, browserv, os, osv);
        // Input capabilities
        const capabilities = {
          browserName,
          browser_version: browserv,
          os,
          os_version: osv,
          resolution: '1024x768',
          'browserstack.user': process.env.BROWSERSTACK_USER,
          'browserstack.key': process.env.BROWSERSTACK_KEY,
          buildName: 'tls-clienthello',
          projectName: 'Double Agent',
        };

        let driver: WebDriver = null;
        try {
          driver = await new webdriver.Builder()
            .usingServer('http://hub-cloud.browserstack.com/wd/hub')
            .withCapabilities(capabilities)
            .build();
        } catch (err) {
          console.log("Couldn't build driver for %s %s on %s %s", browserName, browserv, os, osv);
          return;
        }

        try {
          await driver.get('http://tls.ulixee.org:3006/new');
          await driver.findElement(webdriver.By.id('start')).click();
          await driver.wait(until.urlMatches(/https:\/\/tls\.ulixee\.org*/));
        } finally {
          await driver.quit();
        }
      });
    }
  }
  await queue.onEmpty();
})();
