import CDP from 'chrome-remote-interface';
import * as fs from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { URL } from 'url';
import https from 'https';
import { resolve } from 'path';
import { IncomingMessage } from 'http';
import domScript from '@double-agent/browser-dom/domScript';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';

const options = {
  key: fs.readFileSync(`${__dirname}/../../runner/certs/privkey.pem`),
  cert: fs.readFileSync(`${__dirname}/../../runner/certs/fullchain.pem`),
};

const dataDir = resolve(__dirname, '../data');
const port = process.env.DUMPER_PORT ?? 9000;
const url = new URL(`https://a1.ulixee-test.org:${port}`);

(async function() {
  const server = createServer();
  const serverStarted = new Promise(resolve => {
    server.once('listening', resolve);
  });
  let client;

  try {
    // connect to endpoint
    client = await CDP({ port: process.env.PORT ?? 9224 });
    // extract domains
    const { Network, Page } = client;
    const uploadedPromise = new Promise<any>(resolve => {
      // setup handlers
      Network.responseReceived(params => {
        if (params.response.url.endsWith('/dump')) {
          resolve();
        }
      });
    });
    // enable events then start!
    await Network.enable();
    await Page.enable();
    await serverStarted;
    await Page.navigate({ url: 'https://a1.ulixee-test.org:9000' });
    await uploadedPromise;
  } catch (err) {
    console.error(err);
  } finally {
    if (client) {
      await client.close();
    }
    server.close();
    process.exit();
  }
})();

function createServer() {
  return https
    .createServer(options, async (req, res) => {
      switch (req.url) {
        case '/':
          return res.end(dumpPage);
        case '/dump':
          await captureDump(req);
          return res.end();
      }
    })
    .listen(port);
}

const dumpPage = `
<html><body>
<h1>Running</h1>
${domScript({
  url,
  trackUrl() {
    return `https://a1.ulixee-test.org:${port}/dump`;
  },
} as any)}
<script type="text/javascript">
afterQueueComplete();
</script>
</body></html>`;

async function captureDump(req: IncomingMessage) {
  const profileDirName = getProfileDirNameFromUseragent(req.headers['user-agent']);
  if (!existsSync(`${dataDir}/dom-dumps`)) {
    mkdirSync(`${dataDir}/dom-dumps`);
  }

  let body = '';
  for await (const chunk of req) body += chunk.toString();
  const json = JSON.parse(body);

  const outputPath = `${dataDir}/dom-dumps/${profileDirName}.json`;
  await fs.promises.writeFile(
    `${dataDir}/dom-dumps/${profileDirName}.json`,
    JSON.stringify(json, null, 2),
  );
  console.log('Wrote dump to %s', resolve(outputPath));
}
