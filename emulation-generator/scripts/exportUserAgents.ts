import * as Fs from 'fs';
import 'source-map-support/register';
import Browsers from '@double-agent/profiler/lib/Browsers';
import emulators from '../emulators.json';

const browserKeys: string[] = emulators.map(x => x.key);

const emulationsDir = process.env.PLUGIN_DIR ?? `${__dirname}/../data/emulations`;

export default async function exportUserAgents() {
  const browsers = new Browsers();

  let agentKeys: { [key: string]: string[] } = {};
  for (const browser of browsers.toArray()) {
    const key = browserKeys.find(x => browser.key.startsWith(x));
    if (!key) continue;

    if (!agentKeys[key]) agentKeys[key] = [];
    const agents: string[] = agentKeys[key];
    for (const os of Object.values(browser.byOsKey)) {
      for (const x of os.useragents) {
        if (x.sources.includes('BrowserStack')) agents.push(x.string);
      }
    }

    const basePath = emulationsDir + `/emulate-${key}`;
    if (!Fs.existsSync(basePath)) Fs.mkdirSync(basePath, { recursive: true });
    Fs.writeFileSync(basePath + '/user-agents.json', JSON.stringify(agents, null, 2));
  }
}
