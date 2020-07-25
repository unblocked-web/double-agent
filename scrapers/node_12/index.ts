import http from 'http';
import https from 'https';
import forEachInstruction from '../lib/forEachInstruction';
import { basename } from 'path';

forEachInstruction(basename(__dirname), async instruction => {
  let referer = null;
  for (const page of instruction.pages) {
    if (referer !== page.url) {
      const finalUrl = await httpGet(page.url, instruction.useragent, referer);
      referer = finalUrl ?? page.url;
    }
    if (page.clickDestinationUrl && referer !== page.clickDestinationUrl) {
      const finalRes = await httpGet(page.clickDestinationUrl, instruction.useragent, referer);
      referer = finalRes ?? page.clickDestinationUrl;
    }
  }
}).catch(console.log);

async function httpGet(urlloc: string, useragent: string, referer?: string) {
  const module = urlloc.includes('https') ? https : http;
  const headers: any = {
    'User-Agent': useragent,
  };
  if (referer) headers.Referer = referer;

  console.log('Get %s from %s', urlloc, referer);
  return new Promise<string>((resolve, reject) => {
    module
      .get(
        urlloc,
        {
          rejectUnauthorized: false,
          headers: headers,
        },
        response => {
          if (
            response.headers.location &&
            (response.statusCode === 301 || response.statusCode === 302)
          ) {
            return httpGet(response.headers.location, useragent, urlloc)
              .then(resolve)
              .catch(reject);
          }
          response.on('data', () => null);
          response.on('end', () => resolve(urlloc));
        },
      )
      .on('error', reject)
      .end();
  });
}
