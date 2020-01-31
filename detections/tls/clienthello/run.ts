import fs from 'fs';
import * as path from 'path';
import child_process from 'child_process';
import SecretAgent from '@secret-agent/main';
import { LoadStatus } from '@secret-agent/chrome/lib/Constants';
import puppeteer from 'puppeteer';

const url = 'https://localhost:3007';
const apps = {
  'chrome-79': `open -a "/Applications/Google Chrome.app" "${url}"`,
  'ff-57': `open -a "/Applications/firefox.app" "${url}"`,
  'pupp-19': async () => {
    const puppBrowser = await puppeteer.launch({ ignoreHTTPSErrors: true });
    const page = await puppBrowser.newPage();
    await page.goto(url);
    await page.waitForNavigation({ waitUntil: 'load' });
    await puppBrowser.close();
  },
  'secret-agent-0.2': async () => {
    await SecretAgent.start(1, 4007);
    const agent = await SecretAgent.open();
    const browser = await agent.openBrowser();
    await browser.goto(url);
    await browser.waitForNavigation(LoadStatus.DomContentLoaded);
  },
};

let filestream: fs.WriteStream;
let filepath: string;
(async () => {
  for (const [key, command] of Object.entries(apps)) {
    filepath = `${__dirname}/../../profiles/tls/${key}`;
    if (!fs.existsSync(path.dirname(filepath))) {
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
    }

    filestream = fs.createWriteStream(`${filepath}.txt`, {
      autoClose: true,
    });

    if (typeof command === 'string') {
      const appProcess = child_process.exec(command);
      await new Promise(resolve => setTimeout(resolve, 2e3));
      appProcess.kill();
    } else {
      await command();
    }
  }
})();
