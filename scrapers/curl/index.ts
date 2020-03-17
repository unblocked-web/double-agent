import { Curl } from 'node-libcurl';
import forEachDirective from '../lib/forEachDirective';
import { basename } from 'path';

forEachDirective(basename(__dirname), async directive => {
  const curl = new Curl();
  curl.setOpt('USERAGENT', directive.useragent);
  curl.setOpt('SSL_VERIFYPEER', 0);
  curl.setOpt('COOKIEJAR', __dirname + '/cookiejar.txt');
  curl.setOpt('COOKIESESSION', 1);
  curl.setOpt('FOLLOWLOCATION', 1);
  curl.setOpt('AUTOREFERER', 1);
  for (const page of directive.pages) {
    await httpGet(curl, page.url);
    if (page.clickDestinationUrl) {
      await httpGet(curl, page.clickDestinationUrl);
    }
  }
  curl.close();
}).catch(console.log);

async function httpGet(curl: Curl, url: string) {
  curl.setOpt('URL', url);
  const finished = new Promise((resolve, reject) => {
    curl.on('end', resolve);
    curl.on('error', reject);
  });
  curl.perform();
  await finished;
}
