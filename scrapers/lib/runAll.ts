import * as fs from 'fs';
import scrapers from '../scrapers.json';
import Queue from 'p-queue';
import { fork, spawn } from 'child_process';

(async () => {
  const queue = new Queue({ concurrency: 2 });
  for (const scraper of Object.keys(scrapers)) {
    queue.add(async () => {
      const indexExists = fs.existsSync(`${__dirname}/../${scraper}/index.js`);
      if (indexExists) {
        const p = fork(`${__dirname}/../${scraper}/index.js`);
        return new Promise(resolve => {
          p.on('exit', resolve);
          p.on('error', resolve);
        });
      } else {
        const p = spawn(`${__dirname}/../${scraper}/run.sh`);
        return new Promise(resolve => {
          p.on('exit', resolve);
          p.on('error', resolve);
        });
      }
    });
  }
  await queue.onIdle();
})();
