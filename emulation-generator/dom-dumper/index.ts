import CDP from 'chrome-remote-interface';
import * as fs from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { URL } from 'url';
import https from 'https';
import { resolve } from 'path';
import { IncomingMessage } from 'http';
import domScript from '@double-agent/browser-dom/domScript';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';
import puppeteer from 'puppeteer-core';
import { BrowserFetcher } from 'puppeteer-core/lib/cjs/puppeteer/node/BrowserFetcher';
import browsers from './browsers.json';
import { buildChromeDocker, getDockerHost, runDocker } from './docker';
import * as ChromeLauncher from 'chrome-launcher';

const options = {
  key: fs.readFileSync(`${__dirname}/../../runner/certs/privkey.pem`),
  cert: fs.readFileSync(`${__dirname}/../../runner/certs/fullchain.pem`),
};

const dataDir = resolve(__dirname, '../data');
const port = process.env.DUMPER_PORT ?? 9000;
const url = new URL(`https://a1.ulixee-test.org:${port}`);
const shouldRunDockers = !!process.env.RUN_DOCKERS ?? false;

const server = createServer();
const serverStarted = new Promise(resolve => {
  server.once('listening', resolve);
});

(async function() {
  try {
    for (const { dockerChromeUrl, browser, version, revision } of browsers) {
      if (browser === 'chrome') {
        if (dockerChromeUrl && shouldRunDockers) {
          const dockerHost = getDockerHost()
          console.log('Running Chrome %s on Docker', version);
          const dockerName = buildChromeDocker(version, dockerChromeUrl);
          const docker = await runDocker(dockerName, dockerHost);
          await navigateToUrl(9224);
          docker.kill('SIGTERM');
        }
        if (revision) {
          const revisionInfo = await getBrowserRevision(browser, version, revision);

          console.log('Running Chrome %s on Local (%s)', version, revision);
          const chrome = await launchLocalChrome(revisionInfo.executablePath);

          await navigateToUrl(chrome.port);
          await chrome.kill();
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    server.close();
    process.exit();
  }
})();

async function getBrowserRevision(browser: 'chrome', version: string, revision: string) {
  const localBrowserCache = `${__dirname}/.browsers`;
  if (!existsSync(localBrowserCache)) mkdirSync(localBrowserCache, { recursive: true });

  const browserFetcher: BrowserFetcher = puppeteer.createBrowserFetcher({
    product: browser,
    path: `${localBrowserCache}/${browser}-${version}`,
  });

  let revisionInfo = browserFetcher.revisionInfo(revision);
  if (!revisionInfo.local) {
    let lastPct = 0;
    revisionInfo = await browserFetcher.download(revision, (downloadedBytes, totalBytes) => {
      const pct = Math.floor((100 * downloadedBytes) / totalBytes);
      if (pct % 5 !== 0) return;
      if (pct > lastPct) lastPct = pct;
      else return;
      console.log('Downloading %s-%s: (%s%)', browser, revision, pct);
    });
  }
  return revisionInfo;
}

async function launchLocalChrome(chromePath: string) {
  return await ChromeLauncher.launch({
    chromePath,
    ignoreDefaultFlags: true,
    chromeFlags: [
      '--disable-gpu',
      '--headless',
      '--allow-running-insecure-content',
      '--ignore-certificate-errors'
    ],
  });
}

async function navigateToUrl(developerToolsPort: number) {
  await serverStarted;
  let client;

  try {
    // connect to endpoint
    client = await CDP({ port: developerToolsPort });
    console.log('Connected to chrome devtools (%s)', developerToolsPort);
    // extract domains
    const { Network, Page } = client;
    const uploadedPromise = new Promise<any>(resolve => {
      // setup handlers
      Network.responseReceived(params => {
        if (params.response.url.endsWith('/dump')) {
          console.log('Dump uploaded');
          resolve();
        }
      });
    });
    // enable events then start!
    await Network.enable();
    await Page.enable();
    await Page.navigate({ url: 'https://a1.ulixee-test.org:9000' });
    await uploadedPromise;
  } catch (err) {
    console.error(err);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

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
