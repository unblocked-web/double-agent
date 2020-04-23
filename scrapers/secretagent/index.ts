import 'source-map-support/register';
import forEachDirective from '../lib/forEachDirective';
import { basename } from 'path';
import SecretAgent from 'secret-agent/fullstack';
import { lookup } from 'useragent';
import Emulators from 'secret-agent/emulators';
import Chrome78 from 'secret-agent/emulator-plugins/emulate-chrome-78';
import Chrome79 from 'secret-agent/emulator-plugins/emulate-chrome-79';
import Chrome80 from 'secret-agent/emulator-plugins/emulate-chrome-80';
import Safari13 from 'secret-agent/emulator-plugins/emulate-safari-13-0';
import createEmulatorForAgent from './lib/createEmulatorForAgent';

process.env.MITM_ALLOW_INSECURE = 'true';
(async function() {
  await SecretAgent.start({ maxActiveSessionCount: 10, localProxyPortStart: 3500 });

  try {
    await forEachDirective(
      basename(__dirname),
      async instruction => {
        const emulatorId = getEmulator(instruction.useragent);

        const window = await SecretAgent.createBrowserWindow({
          emulatorId,
        });

        let isFirst = true;

        for (const page of instruction.pages) {
          if (isFirst || page.url !== (await window.location.href)) {
            console.log('loading page %s', page.url);
            window.location.href = page.url;
          }
          isFirst = false;
          await window.waitForAllContentLoaded();
          if (page.waitForElementSelector) {
            console.log('waiting for selector %s', page.waitForElementSelector);
            const element = window.document.querySelector(page.waitForElementSelector);
            await window.waitForElement(element, { waitForVisible: true });
          }
          if (page.clickSelector) {
            console.log('clicking selector %s', page.clickSelector);
            const clickable = window.document.querySelector(page.clickSelector);
            await window.waitForElement(clickable, { waitForVisible: true });
            await window.interact({ click: clickable });
            console.log('waiting for location change');
            await window.waitForLocation('change');
            console.log('location change');
          }
        }
        await window.close();
      },
      1,
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
    class EmulatorForOs extends emulatorPlugin {
      public static key = emulatorId;
      constructor() {
        super(userAgent.os);
      }
    }
    Emulators.load(EmulatorForOs as any);
  } else {
    const emulatorX = createEmulatorForAgent(useragent);
    Emulators.load(emulatorX);
  }
  return emulatorId;
}
