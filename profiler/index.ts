import webdriver, { until, WebDriver } from 'selenium-webdriver';
import Queue from 'p-queue';
import IDirective from '@double-agent/runner/lib/IDirective';
import getBrowsersToProfile from './lib/getBrowsersToProfile';
import { getAgentPath } from '@double-agent/runner/lib/useragentProfileHelper';

export default async function profiler(
  name: string,
  concurrency: number,
  shouldGenerateProfile: (agent: IAgent, directiveProfileDir?: string) => boolean,
  ...directives: (Pick<
    IDirective,
    'url' | 'clickItemSelector' | 'requiredFinalClickSelector' | 'waitForElementSelector'
  > & { profilesDirectory?: string })[]
) {
  const capabilities = await getBrowsersToProfile();
  const queue = new Queue({ concurrency });
  for (const { browser, version: browser_version } of capabilities.browsers) {
    for (const { os, version: os_version } of capabilities.os) {
      // shortcuts to speed things up a tiny bit
      if (browser === 'IE' && os !== 'Windows') continue;
      if (browser === 'Safari' && os !== 'OS X') continue;
      const agent: IAgent = {
        os,
        osv: os_version,
        browser,
        browserv: browser_version,
      };
      agent.useragentPath = useragentPath(agent);
      for (const directive of directives) {
        const shouldGenerate = !shouldGenerateProfile(agent, directive.profilesDirectory);
        if (shouldGenerate === false) {
          continue;
        }
        console.log('needs profile for ', agent.useragentPath);
        continue;
        queue.add(async () => {
          console.log('Running %s %s on %s %s', browser, browser_version, os, os_version);
          // Input capabilities
          const capabilities = {
            browserName: browser,
            browser_version,
            os,
            os_version,
            resolution: '1024x768',
            'browserstack.user': process.env.BROWSERSTACK_USER,
            'browserstack.key': process.env.BROWSERSTACK_KEY,
            'browserstack.safari.allowAllCookies': 'true',
            buildName: name,
            projectName: 'Double Agent',
          };

          let driver: WebDriver = null;
          try {
            driver = await new webdriver.Builder()
              .usingServer('http://hub-cloud.browserstack.com/wd/hub')
              .withCapabilities(capabilities)
              .build();
          } catch (err) {
            console.log(
              "Couldn't build driver for %s %s on %s %s",
              browser,
              browser_version,
              os,
              os_version,
            );
            return;
          }

          try {
            await driver.get(directive.url);
            if (directive.clickItemSelector) {
              await driver.findElement(webdriver.By.css(directive.clickItemSelector)).click();
            }

            if (directive.requiredFinalClickSelector) {
              await driver
                .findElement(webdriver.By.css(directive.requiredFinalClickSelector))
                .click();
            }

            if (directive.waitForElementSelector) {
              await driver.wait(
                until.elementLocated(webdriver.By.css(directive.waitForElementSelector)),
              );
            } else {
              // just wait a few secs
              await driver.sleep(3e3);
            }
          } finally {
            await driver.quit();
          }
        });
      }
    }
  }
  await queue.onEmpty();
}

interface IAgent {
  os: string;
  osv: string;
  browser: string;
  browserv: string;
  useragentPath?: string;
}

const macVersions = {
  Yosemite: '10_10',
  'El Capitan': '10_11',
  Sierra: '10_12',
  'High Sierra': '10_13',
  Mojave: '10_14',
  Catalina: '10_15',
};

const osConversion = {
  'OS X': 'Mac OS X',
  Windows: 'Windows',
};

function useragentPath(agent: IAgent) {
  let osv = agent.osv.split('.');
  if (osv.length === 1) osv.push('0');

  if (agent.os === 'OS X') osv = macVersions[agent.osv].split('_');

  return getAgentPath({
    os: {
      family: osConversion[agent.os],
      major: osv[0],
      minor: osv[1],
    },
    major: agent.browserv.split('.').shift(),
    family: agent.browser,
  } as any);
}
