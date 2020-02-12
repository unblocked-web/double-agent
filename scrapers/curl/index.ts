import { Curl, curly } from 'node-libcurl';
import { inspect } from 'util';
import IDirective from '@double-agent/runner/lib/IDirective';
import { writeFileSync } from 'fs';
import IDetectionResultset from '@double-agent/runner/lib/IDetectionResultset';

(async function() {
  let hasNext = true;
  while (hasNext) {
    const { data } = await curly.get('http://localhost:3000');
    const json = JSON.parse(data);
    if (json.directive) {
      console.log(
        'Next directive %s (%s %s on %s %s)',
        json.directive.url,
        json.directive.browser,
        json.directive.browserMajorVersion ?? '',
        json.directive.os,
        json.directive.osVersion ?? '',
      );
      const instruction = json.directive as IDirective;
      const curl = new Curl();
      curl.setOpt('USERAGENT', instruction.useragent);
      curl.setOpt('SSL_VERIFYPEER', false);
      curl.setOpt('FOLLOWLOCATION', true);
      curl.setOpt('COOKIEJAR', __dirname + '/cookiejar.txt');
      curl.setOpt('COOKIESESSION', 1);
      curl.setOpt('URL', instruction.clickDestinationUrl ?? instruction.url);
      const finished = new Promise((resolve, reject) => {
        curl.on('end', resolve);
        curl.on('error', reject);
      });
      curl.perform();
      await finished;
      if (instruction.requiredFinalUrl) {
        curl.setOpt('URL', instruction.requiredFinalUrl);
        const promise = new Promise((resolve, reject) => {
          curl.on('end', resolve);
          curl.on('error', reject);
        });
        curl.perform();
        await promise;
      }
      curl.close();
    } else {
      console.log('\n\n--------------------\n\nResults', inspect(json, false, null, true));
      for (const test of json.output as IDetectionResultset[]) {
        writeFileSync(
          `results/${test.category}-${test.testName}.json`,
          JSON.stringify(test.results, null, 2),
        );
      }
      break;
    }
  }
})().catch(console.log);
