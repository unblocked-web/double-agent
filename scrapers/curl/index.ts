import { Curl } from 'node-libcurl';
import forEachInstruction from '../lib/forEachInstruction';
import { basename } from 'path';
import { promises as fs } from 'fs';

(async () => {
  const version = Curl.getVersionInfo().version;
  const scrapers = JSON.parse(await fs.readFile(`${__dirname}/../scrapers.json`, 'utf8'));
  scrapers.curl.title = `curl ${version.split('.').slice(0,2).join('.')}`;
  await fs.writeFile(`${__dirname}/../scrapers.json`, JSON.stringify(scrapers, null, 2))
})();

forEachInstruction(basename(__dirname), async instruction => {
  const curl = new Curl();
  curl.setOpt('USERAGENT', instruction.useragent);
  curl.setOpt('SSL_VERIFYPEER', 0);
  curl.setOpt('COOKIEJAR', __dirname + '/cookiejar.txt');
  curl.setOpt('COOKIESESSION', 1);
  curl.setOpt('FOLLOWLOCATION', 1);
  curl.setOpt('AUTOREFERER', 1);

  for (const page of instruction.pages) {
    if (curl.getInfo(Curl.info.EFFECTIVE_URL) !== page.url) {
      console.log('GET ', page.url);
      await httpGet(curl, page.url);
    }
    if (page.clickDestinationUrl) {
      console.log('GET click dest', page.clickDestinationUrl);
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
