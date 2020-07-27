import IAssignment from '@double-agent/runner/interfaces/IAssignment';
import fetch from 'node-fetch';
import { inspect } from 'util';
import Queue from 'p-queue';
import BotDetectionResults from './BotDetectionResults';
import {existsSync, promises as fs} from 'fs';
import zlib from 'zlib';

const runnerDomain = process.env.RUNNER_DOMAIN ?? 'localhost';

export default async function forEachAssignment(
  scraperName: string,
  runAssignment: (assignment: IAssignment) => Promise<void>,
  concurrency = 5,
) {
  const queue = new Queue({ concurrency });
  const assignments = await assignmentServer('/', scraperName);
  const botDetectionResults = new BotDetectionResults();

  const dataDir = `${__dirname}/../${scraperName}/sessions`;
  if (existsSync(dataDir)) {
    await cleanDirectory(dataDir);
  } else {
    await fs.mkdir(dataDir, { recursive: true });
  }

  for (const { id: assignmentId } of assignments) {
    queue.add(async () => {
      console.log(`Getting assignment %s of %s`, assignmentId, assignments.length);
      const assignment = await assignmentServer<IAssignment>('/start', scraperName, assignmentId);
      if (!assignment.sessionid) {
        console.log('ASSIGNMENT: ', assignment);
        process.exit();
      }
      console.log(
        '[%s._] RUNNING %s assignment (%s)',
        assignment.sessionid,
        assignment.testType,
        assignment.profileDirName,
        assignment.useragent,
      );
      try {
        await runAssignment(assignment);
      } catch (error) {
        console.log('ERROR running assignment: ', error)
      }
      try {
        const data = await assignmentServer('/finish', scraperName, assignmentId);
        const filePath = `${dataDir}/${assignment.profileDirName}.json.gz`;
        await fs.writeFile(filePath, await gzipJson(data.session));
        botDetectionResults.trackAssignmentResults(assignment, data.session);
        console.log(`SAVED ${filePath}`);
      } catch (error) {
        console.log('ERROR saving: ', error)
      }
    });
  }

  await queue.onIdle();

  let tries = 0;
  while (tries < 20) {
    const incompleteAssignments = (await assignmentServer('/', scraperName)).filter(x => !x.isCompleted);
    if (!incompleteAssignments.length) break;
    tries += 1;
    console.log(`Waiting on ${incompleteAssignments.length} of ${assignments.length} assignments`);
    incompleteAssignments.forEach(a => console.log(`- ${a.profileDirName}`));
    await new Promise(resolve => setTimeout(resolve, 1e3));
  }

  const summary = extractSummary(botDetectionResults);
  console.log('------ Test Complete --------', inspect(botDetectionResults, false, null, true));
  console.log('------ Summary --------', inspect(summary, false, null, true));
}

async function assignmentServer<T = any>(path: string, scraper: string, assignmentId?: string) {
  const params = [`scraper=${scraper}`];
  if (assignmentId !== undefined) {
    params.push(`assignmentId=${assignmentId}`);
  }
  const response = await fetch(`http://${runnerDomain}:3000${path}?${params.join('&')}`);
  return response.json();
}

function extractSummary(botDetectionResults: BotDetectionResults) {
  const summary = botDetectionResults.toJSON().browserFindings;
  for (const flags of Object.values(summary)) {
    for (const [key, value] of Object.entries(flags)) {
      if (value.botPct === 0) delete flags[key];
    }
  }
  return summary;
}

function gzipJson(json: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.from(JSON.stringify(json, null, 2));
    zlib.gzip(buffer, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

async function cleanDirectory(directory) {
  try {
    const files = await fs.readdir(directory);
    const unlinkPromises = files.map(filename => fs.unlink(`${directory}/${filename}`));
    return Promise.all(unlinkPromises);
  } catch (err) {
    console.log(err);
  }
}
