import { Curl } from 'node-libcurl';
import forEachAssignment from '../lib/forEachAssignment';
import { basename } from 'path';
import { promises as fs } from 'fs';

(async () => {
  const version = Curl.getVersionInfo().version;
  const scrapers = JSON.parse(await fs.readFile(`${__dirname}/../scrapers.json`, 'utf8'));
  scrapers.curl.title = `curl ${version.split('.').slice(0,2).join('.')}`;
  await fs.writeFile(`${__dirname}/../scrapers.json`, JSON.stringify(scrapers, null, 2))
})();

forEachAssignment(basename(__dirname), async assignment => {
  const curl = new Curl();
  curl.setOpt('USERAGENT', assignment.useragent);
  curl.setOpt('SSL_VERIFYPEER', 0);
  curl.setOpt('COOKIEJAR', __dirname + '/cookiejar.txt');
  curl.setOpt('COOKIESESSION', 1);
  curl.setOpt('FOLLOWLOCATION', 1);
  curl.setOpt('AUTOREFERER', 1);

  for (const page of assignment.pages) {
    if (curl.getInfo(Curl.info.EFFECTIVE_URL) !== page.url) {
      try {
        console.log('GET ', page.url);
        await httpGet(curl, page.url);
      } catch(error) {
        console.log(`ERROR getting page.url: ${page.url}`, error);
        throw error;
      }
    }
    if (page.clickDestinationUrl) {
      try {
        console.log('GET click dest', page.clickDestinationUrl);
        await httpGet(curl, page.clickDestinationUrl);
      } catch(error) {
        console.log(`ERROR getting page.clickDestinationUrl: ${page.clickDestinationUrl}`, error);
        throw error;
      }
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
