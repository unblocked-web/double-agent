import CDP from 'chrome-remote-interface';
import * as fs from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { URL } from 'url';
import https from 'https';
import domScript from '../domScript';
import { getUseragentPath } from '@double-agent/runner/lib/profileHelper';
import { resolve } from 'path';
import { IncomingMessage } from 'http';

const options = {
  key: fs.readFileSync(`${__dirname}/../../../../runner/certs/privkey.pem`),
  cert: fs.readFileSync(`${__dirname}/../../../../runner/certs/fullchain.pem`),
};

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
  const agentPath = getUseragentPath(req.headers['user-agent']);
  if (!existsSync(`${__dirname}/../dumps`)) {
    mkdirSync(`${__dirname}/../dumps`);
  }

  let body = '';
  for await (const chunk of req) body += chunk.toString();
  const json = JSON.parse(body);

  const outputPath = `${__dirname}/../dumps/${agentPath}.json`;
  await fs.promises.writeFile(
    `${__dirname}/../dumps/${agentPath}.json`,
    JSON.stringify(json, null, 2),
  );
  console.log('Wrote dump to %s', resolve(outputPath));
}
