/* eslint-disable no-console */
import * as Path from 'path';
import * as Fs from 'fs';
import unzipper from 'unzipper';
import fetch from 'node-fetch';
import IAssignment from '@double-agent/runner/interfaces/IAssignment';
import Queue from 'p-queue';

const runnerDomain = process.env.RUNNER_DOMAIN ?? 'localhost';
const runnerPort = 3000;

export default async function forEachAssignment(
  scraperName: string,
  runAssignment: (assignment: IAssignment) => Promise<void>,
  concurrency = 5,
) {
  const queue = new Queue({ concurrency });
  const dataDir = Path.resolve(__dirname, `./data/${scraperName}`);
  const { assignments } = await assignmentServer('/create', { scraperName, dataDir });

  if (!Fs.existsSync(dataDir)) Fs.mkdirSync(dataDir, { recursive: true });

  for (const { id: assignmentId } of assignments) {
    queue.add(async () => {
      console.log(`Getting assignment %s of %s`, assignmentId, assignments.length);
      const { assignment } = await assignmentServer<IAssignment>(`/activate/${assignmentId}`, { scraperName });
      console.log(
        '[%s._] RUNNING %s assignment (%s)',
        assignment.sessionId,
        assignment.pickTypes,
        assignment.id,
      );
      try {
        await runAssignment(assignment);
        const filesStream = await assignmentServer(`/download/${assignment.id}`, { scraperName });
        const filesDir = Path.resolve(__dirname, 'data/profiles');
        filesStream.pipe(unzipper.Extract({ path: filesDir }))
        console.log('DOWNLOADED TO ', filesDir);
      } catch (error) {
        console.log('ERROR running assignment: ', error)
      }
    });
  }

  await queue.onIdle();
  await assignmentServer('/finish', { scraperName });

  // const analyze = new Analyze();
  // analyze.addProfile();
  // await analyze.results();
  // await Analyze.run(profiles);

  console.log('FINISHED');

  // let tries = 0;
  // while (tries < 20) {
  //   const { finished } = await assignmentServer('/finish', { scraperName });
  //   if (!pendingAssignments.length) break;
  //   tries += 1;
  //   console.log(`Waiting on ${pendingAssignments.length} of ${assignments.length} assignments`);
  //   pendingAssignments.forEach((a: any) => console.log(`- ${a.id}`));
  //   await new Promise(resolve => setTimeout(resolve, 1e3));
  // }

  // const summary = extractSummary(botDetectionResults);
  // console.log('------ Test Complete --------', inspect(botDetectionResults, false, null, true));
  // console.log('------ Summary --------', inspect(summary, false, null, true));
}

async function assignmentServer<T = any>(path: string, params: { scraperName: string, dataDir?: string }) {
  const paramStrs = [`scraper=${params.scraperName}`];
  if (params.dataDir) paramStrs.push(`dataDir=${params.dataDir}`);

  const res = await fetch(`http://${runnerDomain}:${runnerPort}${path}?${paramStrs.join('&')}`);
  const contentType = res.headers.get('content-type');

  if (contentType === 'application/json') {
    const data = await res.json();
    if (res.status >= 400) {
      throw new Error(data.message)
    }
    return data;
  }

  return res.body;
}

// function extractSummary(botDetectionResults: BotDetectionResults) {
//   const summary = botDetectionResults.toJSON().browserFindings;
//   for (const flags of Object.values(summary)) {
//     for (const [key, value] of Object.entries(flags)) {
//       if (value.botPct === 0) delete flags[key];
//     }
//   }
//   return summary;
// }
