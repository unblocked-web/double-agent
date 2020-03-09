import IDirective from '@double-agent/runner/interfaces/IDirective';
import fetch from 'node-fetch';

const runnerDomain = process.env.RUNNER_DOMAIN ?? 'localhost';

export default async function forEachDirective(
  suiteDir: string,
  runDirective: (directive: IDirective) => Promise<void>,
) {
  let hasNext = true;

  while (hasNext) {
    const response = await fetch(`http://${runnerDomain}:3000`, {
      headers: {
        scraper: suiteDir,
      },
    });
    const json = await response.json();
    if (json.directive) {
      const instruction = json.directive as IDirective;

      console.log('Next agent [%s]', instruction.useragent);
      await runDirective(instruction);
    } else {
      console.log('------ Test Complete --------');
      break;
    }
  }
}
