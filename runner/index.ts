import 'source-map-support/register';
import fs, { writeFileSync } from 'fs';
import { Server } from 'http';
import IDetectorModule from './lib/IDetectorModule';
import IDetectionResultset from './lib/IDetectionResultset';
import * as url from 'url';

let port = Number(process.env.PORT ?? 3000);
(async function() {
  const results: IDetectionResultset[] = [];
  let activeDetector: IDetectorModule;
  const agentDetectors: { [name: string]: IDetectorModule[] } = {};

  function getPort() {
    return (port += 1);
  }
  async function nextDirective(agent: string) {
    if (!agentDetectors[agent]) {
      agentDetectors[agent] = getAllDetectors();
    }
    if (!activeDetector) {
      activeDetector = agentDetectors[agent].shift();
      // if no more detectors, return
      if (!activeDetector) {
        delete agentDetectors[agent];
        return null;
      }
      // not implemented yet
      if (!activeDetector.module) {
        activeDetector = null;
        return nextDirective(agent);
      }

      const module = activeDetector.module;
      await module.start(() => getPort());
      activeDetector.module = module;
    }

    const directive = await activeDetector.module.nextDirective();
    if (directive) {
      directive.module = [activeDetector.category, activeDetector.testName].join(' - ');
      return directive;
    }
    const test = {
      category: activeDetector.category,
      testName: activeDetector.testName,
      results: activeDetector.module.getResults(),
    };
    results.push(test);

    writeFileSync(
      `../scrapers/${agent}/results/${test.category}-${test.testName}.json`,
      JSON.stringify(test.results, null, 2),
    );
    activeDetector = null;
    return nextDirective(agent);
  }

  const etcHostEntries: string[] = [];
  for (const detector of getAllDetectors()) {
    for (const host of detector.module?.etcHostEntries ?? []) {
      if (!etcHostEntries.includes(host)) etcHostEntries.push(host);
    }
  }
  const etcHostEntry = etcHostEntries.map(x => `127.0.0.1      ${x}`).join('\n');

  new Server(async (req, res) => {
    const requestUrl = url.parse(req.url);
    if (requestUrl.pathname !== '/') {
      res.writeHead(200);
      return res.end('OK');
    }
    const agent = req.headers.scraper ?? requestUrl.query?.split('scraper=').pop();
    if (!agent) {
      return res
        .writeHead(500, {
          'content-type': 'application/json',
        })
        .end(JSON.stringify({ message: 'Please provide a scraper header or query param' }));
    }
    const directive = await nextDirective(agent as string);
    res.writeHead(200, {
      'content-type': 'application/json',
    });
    if (!directive) {
      console.log(
        '\n\n--------------------  Results Complete for "%s"  -------------------\n\n',
        agent,
      );
      res.end(JSON.stringify({ results }));
    } else {
      res.end(JSON.stringify({ directive }));
    }
  })
    .listen(port, () => {
      console.log(
        `
First time only:
1. Go to the test-suite/certs directory and run generate.sh
2. To run the https tests, you will need to install trusted certificates onto your machine. 
   --> On a mac, click on certs/fullchain.pem and add to your System certs and then set Trust to "Secure Sockets Layer" -> Always Trust
   --> On windows... lmgtfy?? sorry..
3. Add the following entries to /etc/hosts if running locally:

${etcHostEntry}

Run the suite:
4. Point your scraper at http://localhost:${port} to get your first instruction. 
5. Follow the instruction, and then ask this same url for your next instruction. Instructions will be returned until the test suite is completed.`,
      );
    })
    .on('error', err => console.log(err));
})();

function getAllDetectors() {
  const detectors: IDetectorModule[] = [];
  for (const category of fs.readdirSync('../detections')) {
    if (!fs.statSync(`../detections/${category}`).isDirectory()) continue;
    for (const testName of fs.readdirSync(`../detections/${category}`)) {
      if (!fs.statSync(`../detections/${category}/${testName}`).isDirectory()) continue;
      // if (testName !== 'clienthello') continue
      const entry = {
        category,
        testName,
      } as IDetectorModule;
      try {
        const Module = require(`../detections/${category}/${testName}/detector`)?.default;
        if (Module) entry.module = new Module();
      } catch (err) {}

      try {
        entry.summary = require(`../detections/${category}/${testName}/package.json`)?.description;
        detectors.push(entry);
      } catch (err) {}
    }
  }
  console.log('Test Suites Activated', detectors.map(x => `${x.module ? '✓':'x'} ${x.category}-${x.testName} - ${x.summary}`).sort().reverse());
  return detectors;
}
