import IDirective from '@double-agent/runner/interfaces/IDirective';
import fetch from 'node-fetch';
import { inspect } from 'util';
import Queue from 'p-queue';

const runnerDomain = process.env.RUNNER_DOMAIN ?? 'localhost';

export default async function forEachDirective(
  suiteDir: string,
  runDirective: (directive: IDirective) => Promise<void>,
  concurrency = 5,
) {
  const queue = new Queue({ concurrency });

  let done = false;
  function queueDirective() {
    return queue.add(async () => {
      if (done) {
        return;
      }

      console.log('Getting next directive', `http://${runnerDomain}:3000`);
      const response = await fetch(`http://${runnerDomain}:3000`, {
        headers: {
          scraper: suiteDir,
        },
      });
      const json = await response.json();

      if (json.directive) {
        const instruction = json.directive as IDirective;

        queueDirective();
        console.log('Running agent [%s]', instruction.useragent);
        await runDirective(instruction);
      } else {
        done = true;
        console.log('Done: ', json);
      }
    });
  }
  await queueDirective();
  await queue.onIdle();
  const response = await fetch(`http://${runnerDomain}:3000/results`, {
    headers: {
      scraper: suiteDir,
    },
  });
  const json = await response.json();
  console.log('------ Test Complete --------', inspect(json, false, null, true));
}
