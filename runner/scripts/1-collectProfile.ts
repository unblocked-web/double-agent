import * as Fs from 'fs';
import * as Path from 'path';
import Puppeteer from 'puppeteer';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import runAssignmentInPuppeteer from '../lib/runAssignmentInPuppeteer';
import cleanPuppeteerPageCache from '../lib/cleanPuppeteerPageCache';
import assignmentServer from '../lib/assignmentServer';
import saveAssignmentToProfileDir from '../lib/saveAssignmentToProfileDir';

(async function run() {
  const puppeteer = await Puppeteer.launch({
    headless: false,
    ignoreHTTPSErrors: true,
  });

  const puppSession = await puppeteer.createIncognitoBrowserContext();
  const puppPage = await puppSession.newPage();
  const baseProfileDir = Path.resolve(__dirname, '../data/1-collected-profiles');
  const tmpProfileDir = Path.resolve(baseProfileDir, '.tmp');

  const options = { userId: 'testing', dataDir: `download` };
  const { assignment } = await assignmentServer<IAssignment>('/', options);

  await cleanPuppeteerPageCache(puppPage);
  await runAssignmentInPuppeteer(puppPage, assignment);
  await puppPage.close().catch(); // eslint-disable-line promise/valid-params
  await puppeteer.close();
  await saveAssignmentToProfileDir(assignment, tmpProfileDir);
  copyTmpToFinal(assignment, tmpProfileDir, baseProfileDir);
})().catch(console.log);

// HELPERS

function copyTmpToFinal(assignment: IAssignment, fromBaseDir: string, toBaseDir: string) {
  const fromDir = `${fromBaseDir}/${assignment.id}`;
  const tmpFileNames = Fs.readdirSync(fromDir);
  let { userAgentId } = JSON.parse(Fs.readFileSync(`${fromDir}/${tmpFileNames[0]}`, 'utf8'));
  userAgentId = `${userAgentId.replace('-headless', '')}`;

  console.log(`SAVING ${assignment.id} -> ${userAgentId}`);

  const toDir = Path.join(toBaseDir, userAgentId);
  if (!Fs.existsSync(toDir)) Fs.mkdirSync(toDir, { recursive: true });

  for (const tmpFileName of tmpFileNames) {
    Fs.renameSync(`${fromDir}/${tmpFileName}`, `${toDir}/${tmpFileName}`);
  }
  Fs.rmdirSync(fromBaseDir, { recursive: true });
}
