import http from 'http';
import https from 'https';
import url from 'url';
import forEachDirective from '../lib/forEachDirective';
import { basename } from 'path';

forEachDirective(basename(__dirname), async directive => {
  await httpGet(directive.clickDestinationUrl ?? directive.url, directive.useragent);

  if (directive.requiredFinalUrl) {
    await httpGet(directive.requiredFinalUrl, directive.useragent);
  }
}).catch(console.log);

async function httpGet(urlloc: string, useragent: string) {
  const module = urlloc.includes('https') ? https : http;
  return new Promise((resolve, reject) => {
    module
      .request(
        {
          ...url.parse(urlloc),
          rejectUnauthorized: false,
          method: 'GET',
          headers: {
            'User-Agent': useragent,
          },
        },
        response => {
          if (
            response.headers.location &&
            (response.statusCode === 301 || response.statusCode === 302)
          ) {
            return httpGet(response.headers.location, useragent)
              .then(resolve)
              .catch(reject);
          }
          response.on('data', () => null);
          response.on('end', resolve);
        },
      )
      .on('error', reject)
      .end();
  });
}
