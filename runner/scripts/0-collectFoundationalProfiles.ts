import * as Fs from 'fs';
import * as Path from 'path';
import Puppeteer from 'puppeteer';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import RealUserAgents from "@double-agent/real-user-agents";
import runAssignmentInPuppeteer from '../lib/runAssignmentInPuppeteer';
import cleanPuppeteerPageCache from '../lib/cleanPuppeteerPageCache';
import assignmentServer from '../lib/assignmentServer';
import saveAssignmentToProfileDir from '../lib/saveAssignmentToProfileDir';
import externalUserAgentConfig from '../data/external/userAgentConfig.json';

const slabDataDir = process.env.SLAB_DATA_DIR || Path.resolve(__dirname, '../../../slab/.data');
const slabProfilesDir = Path.join(slabDataDir, 'profiles');

importSlabProfiles();

function importSlabProfiles() {
  for (const userAgentId of Fs.readdirSync(slabProfilesDir)) {
    if (!externalUserAgentConfig.browserIds.some(x => userAgentId.includes(x))) continue;
    const userAgent = RealUserAgents.getId(userAgentId);
    if (!userAgent) throw new Error(`${userAgentId} not supported by RealUserAgents`);

    const fromDir = `${slabProfilesDir}/${userAgentId}`;
    const toDir = Path.join(__dirname, `../data/external/0-foundational-profiles/${userAgentId}`);
    copyDir(fromDir, toDir);
  }
}

// async function collectLocalProfiles() {
//   const puppeteer = await Puppeteer.launch({
//     headless: false,
//     ignoreHTTPSErrors: true,
//   });
//
//   const puppSession = await puppeteer.createIncognitoBrowserContext();
//   const puppPage = await puppSession.newPage();
//   const baseProfileDir = Path.resolve(__dirname, '../data/local/0-foundational-profiles');
//   const tmpProfileDir = Path.resolve(baseProfileDir, '.tmp');
//
//   const options = { userId: 'testing', dataDir: `download` };
//   const { assignment } = await assignmentServer<IAssignment>('/', options);
//
//   await cleanPuppeteerPageCache(puppPage);
//   await runAssignmentInPuppeteer(puppPage, assignment);
//   await puppPage.close().catch(); // eslint-disable-line promise/valid-params
//   await puppeteer.close();
//   await saveAssignmentToProfileDir(assignment, tmpProfileDir);
//   copyTmpToFinal(assignment, tmpProfileDir, baseProfileDir);
// }

// HELPERS

function copyTmpToFinal(assignment: IAssignment, fromBaseDir: string, toBaseDir: string) {
  const fromDir = `${fromBaseDir}/${assignment.id}`;
  const tmpFileNames = Fs.readdirSync(fromDir);
  let { userAgentId } = JSON.parse(Fs.readFileSync(`${fromDir}/${tmpFileNames[0]}`, 'utf8'));
  userAgentId = `${userAgentId.replace('-headless', '')}`;

  const toDir = Path.join(toBaseDir, userAgentId);
  console.log(`SAVING ${assignment.id} -> ${userAgentId}`);
  moveDir(fromDir, toDir);
  removeDir(fromBaseDir);
}

function moveDir(fromDir: string, toDir: string) {
  const fileNamesToCopy = Fs.readdirSync(fromDir);
  if (!Fs.existsSync(toDir)) Fs.mkdirSync(toDir, { recursive: true });

  for (const fileNameToCopy of fileNamesToCopy) {
    Fs.renameSync(`${fromDir}/${fileNameToCopy}`, `${toDir}/${fileNameToCopy}`);
  }
}

function copyDir(fromDir: string, toDir: string) {
  const fileNamesToCopy = Fs.readdirSync(fromDir);
  if (!Fs.existsSync(toDir)) Fs.mkdirSync(toDir, { recursive: true });

  for (const fileNameToCopy of fileNamesToCopy) {
    Fs.copyFileSync(`${fromDir}/${fileNameToCopy}`, `${toDir}/${fileNameToCopy}`);
  }
}

function removeDir(dir: string) {
  try {
    Fs.rmdirSync(dir, {recursive: true});
  } catch (error) {
    console.log(`Error trying to remove ${dir}`, error);
    console.log('RETRYING...');
    removeDir(dir);
  }
}

