import 'source-map-support/register';
import fs from 'fs';
import { Server } from 'http';
import IDetectorModule from './lib/IDetectorModule';
import IDetectionResultset from './lib/IDetectionResultset';

let port = Number(process.env.PORT ?? 3000);
(async function() {
  const detectors = getAllDetectors();
  const results: IDetectionResultset[] = [];
  let activeDetector: IDetectorModule;

  function getPort() {
    return (port += 1);
  }
  async function nextDirective() {
    if (!activeDetector) {
      activeDetector = detectors.shift();
      if (!activeDetector) return null;
      // not implemented yet
      if (!activeDetector.module) {
        activeDetector = null;
        return nextDirective();
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
    results.push({
      category: activeDetector.category,
      testName: activeDetector.testName,
      results: activeDetector.module.getResults(),
    });
    activeDetector = null;
    return nextDirective();
  }

  const etcHostEntries: string[] = [];
  for (const detector of detectors) {
    for (const host of detector.module?.etcHostEntries ?? []) {
      if (!etcHostEntries.includes(host)) etcHostEntries.push(host);
    }
  }
  const etcHostEntry = etcHostEntries.map(x => `127.0.0.1      ${x}`).join('\n');

  new Server(async (req, res) => {
    if (req.url !== '/') {
      res.writeHead(200);
      return res.end('OK');
    }
    const directive = await nextDirective();
    res.writeHead(200, {
      'content-type': 'application/json',
    });
    if (!directive) {
      res.end(JSON.stringify({ output: results }, null, 2));
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
      if (testName !== 'headers') continue;
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
  console.log(detectors);
  return detectors;
}
