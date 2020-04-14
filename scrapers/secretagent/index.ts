import 'source-map-support/register';
import forEachDirective from '../lib/forEachDirective';
import { basename } from 'path';
import SecretAgent from 'secret-agent/main';
import { LoadStatus } from 'secret-agent/chrome/lib/Constants';
import { lookup } from 'useragent';
import { Emulator, UserAgents } from 'secret-agent/emulators';
import Chrome77 from 'secret-agent/emulator-plugins/emulate-chrome-77';
import GenericEmulator from './lib/GenericEmulator';
import Chrome79 from 'secret-agent/emulator-plugins/emulate-chrome-79';
import Chrome80 from 'secret-agent/emulator-plugins/emulate-chrome-80';
import Safari12 from 'secret-agent/emulator-plugins/emulate-safari-12';
import Safari13 from 'secret-agent/emulator-plugins/emulate-safari-13-0';

process.env.MITM_ALLOW_INSECURE = 'true';
(async function() {
  await SecretAgent.start(10, 3500);

  try {
    await forEachDirective(
      basename(__dirname),
      async instruction => {
        const userAgent = lookup(instruction.useragent);
        let emulator: Emulator;
        if (userAgent.family === 'Chrome' && userAgent.major === '77') {
          emulator = new Chrome77(userAgent.os);
        } else if (userAgent.family === 'Chrome' && userAgent.major === '79') {
          emulator = new Chrome79(userAgent.os);
        } else if (userAgent.family === 'Chrome' && userAgent.major === '80') {
          emulator = new Chrome80(userAgent.os);
        } else if (userAgent.family === 'Safari' && userAgent.major === '12') {
          emulator = new Safari12(userAgent.os);
        } else if (userAgent.family === 'Safari' && userAgent.major === '13') {
          emulator = new Safari13(userAgent.os);
        } else {
          const agent =
            UserAgents.findOne({
              deviceCategory: 'desktop',
              family: userAgent.family,
              versionMajor: Number(userAgent.major),
            }) ??
            UserAgents.convertAgent(userAgent, {
              deviceCategory: 'desktop',
              userAgent: instruction.useragent,
              platform:
                userAgent.os.family === 'Windows'
                  ? 'Win32'
                  : userAgent.os.family === 'Linux'
                  ? 'Linux x86_64'
                  : 'MacIntel',
              vendor: 'Google Inc.',
            });

          emulator = new GenericEmulator(agent);
        }

        const agent = await SecretAgent.open({ emulator });
        const page = await agent.openBrowser();

        for (const instrPage of instruction.pages) {
          if (instrPage.url !== page.navigationUrl) {
            await page.goto(instrPage.url);
          }
          await page.waitForNavigation(LoadStatus.AllContentLoaded);
          if (instrPage.waitForElementSelector) {
            console.log('waiting for selector %s', instrPage.waitForElementSelector);
            await page.waitForDom(instrPage.waitForElementSelector);
          }
          if (instrPage.clickSelector) {
            console.log('clicking selector %s', instrPage.clickSelector);
            await page.waitForDom(instrPage.clickSelector);
            await page.click(instrPage.clickSelector);
            await page.waitForNavigation(LoadStatus.AllContentLoaded);
          }
        }
        await agent.close();
      },
      10,
    );
  } finally {
    await SecretAgent.shutdown();
    process.exit();
  }
})().catch(console.log);
