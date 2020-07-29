import * as Path from 'path';
import IAssignment from '@double-agent/runner/interfaces/IAssignment';
import fetch from 'node-fetch';
import { inspect } from 'util';
import Queue from 'p-queue';
import BotDetectionResults from './BotDetectionResults';

const runnerDomain = process.env.RUNNER_DOMAIN ?? 'localhost';

export default async function forEachAssignment(
  scraperName: string,
  runAssignment: (assignment: IAssignment) => Promise<void>,
  concurrency = 5,
) {
  const queue = new Queue({ concurrency });
  const dataDir = Path.resolve(__dirname, `../${scraperName}/sessions`);
  const { assignments } = await assignmentServer('/start', { scraperName, dataDir });
  const botDetectionResults = new BotDetectionResults();

  for (const { id: assignmentId } of assignments) {
    queue.add(async () => {
      console.log(`Getting assignment %s of %s`, assignmentId, assignments.length);
      const { assignment } = await assignmentServer<IAssignment>(`/start/${assignmentId}`, { scraperName });
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
        const { session } = await assignmentServer(`/finish/${assignmentId}`, { scraperName });
        botDetectionResults.trackAssignmentResults(assignment, session);
      } catch (error) {
        console.log('ERROR completing: ', error)
      }
    });
  }

  await queue.onIdle();

  let tries = 0;
  while (tries < 20) {
    const { pendingAssignments } = await assignmentServer('/finish', { scraperName });
    if (!pendingAssignments.length) break;
    tries += 1;
    console.log(`Waiting on ${pendingAssignments.length} of ${assignments.length} assignments`);
    pendingAssignments.forEach(a => console.log(`- ${a.profileDirName}`));
    await new Promise(resolve => setTimeout(resolve, 1e3));
  }

  const summary = extractSummary(botDetectionResults);
  console.log('------ Test Complete --------', inspect(botDetectionResults, false, null, true));
  console.log('------ Summary --------', inspect(summary, false, null, true));
}

async function assignmentServer<T = any>(path: string, params: { scraperName: string, dataDir?: string }) {
  const paramStrs = [`scraper=${params.scraperName}`];
  if (params.dataDir) paramStrs.push(`dataDir=${params.dataDir}`);

  const response = await fetch(`http://${runnerDomain}:3000${path}?${paramStrs.join('&')}`);
  const data = await response.json();

  if (response.status >= 400) {
    throw new Error(data.message)
  }

  return data;
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
