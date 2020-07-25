import 'source-map-support/register';
import forEachInstruction from '../lib/forEachInstruction';
import { basename } from 'path';
import SecretAgent from 'secret-agent';
import { lookup } from 'useragent';
import Emulators from '@secret-agent/emulators';
import Chrome78 from '@secret-agent/emulate-chrome-78';
import Chrome79 from '@secret-agent/emulate-chrome-79';
import Chrome80 from '@secret-agent/emulate-chrome-80';
import Safari13 from '@secret-agent/emulate-safari-13';
import createEmulatorForAgent, { buildUserAgentProfile } from './lib/createEmulatorForAgent';
import IInstructionPage from '@double-agent/runner/interfaces/IInstructionPage';
import Browser from '@secret-agent/client/lib/Browser';

process.env.MITM_ALLOW_INSECURE = 'true';
(async function() {
  await SecretAgent.start({ maxActiveSessionCount: 10, localProxyPortStart: 3500 });

  try {
    await forEachInstruction(
      basename(__dirname),
      async instruction => {
        let browser: Browser;
        let lastPage: IInstructionPage;
        try {
          const emulatorId = getEmulator(instruction.useragent);

          browser = await SecretAgent.createBrowser({
            emulatorId,
          });

          let isFirst = true;

          let counter = 0;
          for (const page of instruction.pages) {
            lastPage = page;
            const step = `[${instruction.sessionid}.${counter}]`;
            if (isFirst || page.url !== (await browser.url)) {
              console.log('%s Load -- %s', step, page.url);
              await browser.goto(page.url);
            }
            isFirst = false;
            await browser.waitForAllContentLoaded();
            if (page.waitForElementSelector) {
              console.log('%s WaitFor -- %s', step, page.waitForElementSelector);
              const element = browser.document.querySelector(page.waitForElementSelector);
              await browser.waitForElement(element, { waitForVisible: true, timeoutMs: 60e3 });
            }
            if (page.clickSelector) {
              const clickable = browser.document.querySelector(page.clickSelector);
              console.log('%s WaitFor -- %s', step, page.clickSelector);
              await browser.waitForElement(clickable, { waitForVisible: true });
              console.log('%s Click -- %s', step, page.clickSelector);
              await browser.click(clickable);
              await browser.waitForLocation('change');
              console.log('%s Location Change -- %s', step, page.url);
            }
            counter += 1;
          }
          console.log('[%s.✔] Done', instruction.sessionid);
        } catch (err) {
          console.log('[%s.x] Error on %s', instruction.sessionid, lastPage?.url, err);
        } finally {
          if (browser) {
            await browser.close();
          }
        }
      },
      5,
    );
  } finally {
    await SecretAgent.shutdown();
    process.exit();
  }
})().catch(console.log);

const emulatorMap = {
  Chrome78: Chrome78,
  Chrome79: Chrome79,
  Chrome80: Chrome80,
  Safari13: Safari13,
};

// emulators in secret agent choose their own OS. Need to do a little work here to get Secret Agent
// to try out the user agents we want it to
function getEmulator(useragent: string): string {
  const userAgent = lookup(useragent);
  let emulatorId = useragent;
  const emulatorPlugin = emulatorMap[userAgent.family + userAgent.major];

  if (emulatorPlugin) {
    const agentProfile = buildUserAgentProfile(useragent);
    class EmulatorForOs extends emulatorPlugin {
      public static emulatorId = emulatorId;
      constructor() {
        super(agentProfile);
      }
    }
    Emulators.load(EmulatorForOs as any);
  } else {
    const emulatorX = createEmulatorForAgent(useragent);
    Emulators.load(emulatorX);
  }
  return emulatorId;
}
