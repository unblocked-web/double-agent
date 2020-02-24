import getAllDetectors, { detectionsDir } from '@double-agent/runner/lib/getAllDetectors';
import getBrowsersToProfile, { toLooseAgent } from './getBrowsersToProfile';
import IStatcounterAgent from '../interfaces/IStatcounterAgent';
import { isBrowserSupported } from './browserStackSupport';
import { getAgentPath } from '@double-agent/runner/lib/useragentProfileHelper';
import fs, { existsSync } from 'fs';
import { inspect } from 'util';

(async function() {
  const detectors = await getAllDetectors();
  const toProfile = await getBrowsersToProfile();
  const agents: IStatcounterAgent[] = [];
  for (const browser of toProfile.browsers) {
    for (const os of toProfile.os) {
      const agent = {
        browserv: browser.version,
        browser: browser.browser,
        osv: os.version,
        os: os.os,
        useragentPath: getAgentPath(toLooseAgent(browser, os) as any),
      };
      if (await isBrowserSupported(agent)) {
        agents.push(agent);
      }
    }
  }
  console.log('Looking for missing detection browser profiles....\n\n');
  for (const detector of detectors) {
    if (!detector.module) continue;
    const profilesDir = `${detectionsDir}/${detector.category}/${detector.testName}/profiles`;
    const { directives } = JSON.parse(fs.readFileSync(profilesDir + '/_directives.json', 'utf8'));
    const missing = [];
    for (const directive of directives) {
      for (const agent of agents) {
        const fullpath = [
          profilesDir,
          directive.profilesDirectory,
          agent.useragentPath + '--0.json',
        ]
          .filter(Boolean)
          .join('/');
        if (!existsSync(fullpath)) {
          missing.push({
            agent: agent.useragentPath,
            subdir: directive.profilesDirectory,
          });
        }
      }
    }

    if (missing.length) {
      console.log(
        'Missing %s/%s ---> %s\n\n',
        detector.category,
        detector.testName,
        inspect(missing, false, null, true),
      );
    } else {
      console.log(
        'None missing: %s/%s\n',
        detector.category,
        detector.testName,
      );
    }
  }
})();
