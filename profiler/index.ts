import webdriver, { Key, until, WebDriver } from 'selenium-webdriver';
import Queue from 'p-queue';
import IDirective from '@double-agent/runner/lib/IDirective';
import getBrowsersToProfile, { toLooseAgent } from './lib/getBrowsersToProfile';
import { getAgentPath } from '@double-agent/runner/lib/useragentProfileHelper';
import { isBrowserSupported } from './lib/browserStackSupport';
import IStatcounterAgent from './interfaces/IStatcounterAgent';

export default async function profiler(
  name: string,
  concurrency: number,
  shouldGenerateProfile: (agent: IStatcounterAgent, directiveProfileDir?: string) => boolean,
  ...directives: IProfileDirective[]
) {
  const capabilities = await getBrowsersToProfile();
  const queue = new Queue({ concurrency });
  for (const { browser, version: browser_version } of capabilities.browsers) {
    for (const { os, version: os_version } of capabilities.os) {
      const agent: IStatcounterAgent = {
        os,
        osv: os_version,
        browser,
        browserv: browser_version,
      };
      const isSupported = await isBrowserSupported(agent);
      if (!isSupported) {
        console.log("Browserstack doesn't support", browser, browser_version, os, os_version);
        continue;
      }
      agent.useragentPath = useragentPath(agent);
      for (const directive of directives) {
        const shouldGenerate = !shouldGenerateProfile(agent, directive.profilesDirectory);
        if (shouldGenerate === false) {
          continue;
        }

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

          const needsEnterKey = browser == 'Safari';
          const times = directive.hits ?? 1;

          try {
            for (let i = 0; i < times; i += 1) {
              await runDirective(driver, directive, needsEnterKey, times > 1);
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

async function runDirective(
  driver: WebDriver,
  directive: IProfileDirective,
  needsEnterKey = false,
  newWindow = false,
) {
  console.log('GET %s', directive.url);
  await driver.get(directive.url);
  if (directive.clickItemSelector) {
    const elem = await driver.wait(
      until.elementLocated(webdriver.By.css(directive.clickItemSelector)),
    );
    if (needsEnterKey) {
      await elem.sendKeys(Key.RETURN);
    } else {
      await elem.click();
    }
  }

  if (directive.requiredFinalClickSelector) {
    const elem = await driver.wait(
      until.elementLocated(webdriver.By.css(directive.requiredFinalClickSelector)),
    );
    if (needsEnterKey) {
      await elem.sendKeys(Key.RETURN);
    } else {
      await elem.click();
    }
  }

  if (directive.waitForElementSelector) {
    await driver.wait(until.elementLocated(webdriver.By.css(directive.waitForElementSelector)));
  } else {
    // just wait a few secs
    await driver.sleep(3e3);
  }
  if (newWindow) {
    console.log('Opening new window');
    await driver.executeScript('window.open()');
    await driver.close();
    const handles = await driver.getAllWindowHandles();
    await driver.switchTo().window(handles.pop());
  }
}

function useragentPath(agent: IStatcounterAgent) {
  const looseAgent = toLooseAgent(
    { browser: agent.browser, version: agent.browserv },
    { os: agent.os, version: agent.osv },
  );

  return getAgentPath(looseAgent as any);
}

type IProfileDirective = Pick<
  IDirective,
  'url' | 'clickItemSelector' | 'requiredFinalClickSelector' | 'waitForElementSelector'
> & { profilesDirectory?: string; hits?: number };
