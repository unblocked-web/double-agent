import axios from 'axios';
import IStatcounterAgent from '../interfaces/IStatcounterAgent';

let supportedCapabilities = [];

async function getCapabilities() {
  if (!supportedCapabilities.length) {
    supportedCapabilities = await axios
      .get('https://api.browserstack.com/automate/browsers.json', {
        auth: {
          password: process.env.BROWSERSTACK_KEY,
          username: process.env.BROWSERSTACK_USER,
        },
      })
      .then(x => x.data);
  }
  return supportedCapabilities;
}

export async function isBrowserSupported(agent: IStatcounterAgent) {
  const { os, osv, browserv, browser } = agent;
  const capabilities = await getCapabilities();
  return capabilities.find(x => {
    return (
      x.os === os &&
      x.os_version === osv &&
      x.browser === browser.toLowerCase() &&
      (x.browser_version === browserv ||
        x.browser_version === [browserv, '0'].join('.'))
    );
  });
}
