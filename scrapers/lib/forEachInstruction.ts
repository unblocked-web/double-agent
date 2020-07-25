import IInstruction from '@double-agent/runner/interfaces/IInstruction';
import fetch from 'node-fetch';
import { inspect } from 'util';
import Queue from 'p-queue';

const runnerDomain = process.env.RUNNER_DOMAIN ?? 'localhost';

export default async function forEachInstruction(
  suiteDir: string,
  runInstruction: (instruction: IInstruction) => Promise<void>,
  concurrency = 5,
) {
  const queue = new Queue({ concurrency });

  let done = false;
  function queueInstruction() {
    return queue.add(async () => {
      if (done) {
        return;
      }

      console.log('Getting next instruction', `http://${runnerDomain}:3000`);
      const response = await fetch(`http://${runnerDomain}:3000`, {
        headers: {
          scraper: suiteDir,
        },
      });
      const json = await response.json();

      if (json.instruction) {
        const instruction = json.instruction as IInstruction;

        queueInstruction();
        console.log(
          '[%s._] Running %s instruction (%s)',
          instruction.sessionid,
          instruction.testType,
          instruction.profileDirName,
          instruction.useragent,
        );
        await runInstruction(instruction);
      } else {
        done = true;
        console.log('Done: ', json);
      }
    });
  }
  await queueInstruction();
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
