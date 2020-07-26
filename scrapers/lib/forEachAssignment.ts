import IAssignment from '@double-agent/runner/interfaces/IAssignment';
import fetch from 'node-fetch';
import { inspect } from 'util';
import Queue from 'p-queue';

const runnerDomain = process.env.RUNNER_DOMAIN ?? 'localhost';

export default async function forEachAssignment(
  suiteDir: string,
  runAssignment: (assignment: IAssignment) => Promise<void>,
  concurrency = 5,
) {
  const queue = new Queue({ concurrency });

  let done = false;
  function queueAssignment() {
    return queue.add(async () => {
      if (done) {
        return;
      }

      console.log('Getting next assignment', `http://${runnerDomain}:3000`);
      const response = await fetch(`http://${runnerDomain}:3000`, {
        headers: {
          scraper: suiteDir,
        },
      });
      const json = await response.json();

      if (json.assignment) {
        const assignment = json.assignment as IAssignment;

        queueAssignment();
        console.log(
          '[%s._] Running %s assignment (%s)',
          assignment.sessionid,
          assignment.testType,
          assignment.profileDirName,
          assignment.useragent,
        );
        await runAssignment(assignment);
      } else {
        done = true;
        console.log('Done: ', json);
      }
    });
  }
  await queueAssignment();
  await queue.onIdle();
  const response = await fetch(`http://${runnerDomain}:3000/results`, {
    headers: {
      scraper: suiteDir,
    },
  });
  const json = await response.json();
  console.log('------ Test Complete --------', inspect(json, false, null, true));

  const summary = json.result.browserFindings;
  for (const flags of Object.values(summary)) {
    for (const [key, value] of Object.entries(flags)) {
      if (value.botPct === 0) delete flags[key];
    }
  }
  console.log('------ Summary --------', inspect(summary, false, null, true));
}
