import IDirective from '@double-agent/runner/lib/IDirective';
import fetch from 'node-fetch';

export default async function forEachDirective(
  suiteDir: string,
  runDirective: (directive: IDirective) => Promise<void>,
) {
  let hasNext = true;

  while (hasNext) {
    const response = await fetch('http://localhost:3000', {
      headers: {
        scraper: suiteDir,
      },
    });
    const json = await response.json();
    if (json.directive) {
      const instruction = json.directive as IDirective;

      console.log(
        'Next directive %s [%s]',
        instruction.module ?? instruction.url,
        instruction.useragent,
      );
      await runDirective(instruction);
    } else {
      console.log('------ Test Complete --------');
      break;
    }
  }
}
