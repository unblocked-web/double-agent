import http from 'http';
import https from 'https';
import { existsSync, promises as fs } from 'fs';
import { URL } from 'url';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import httpRequestHandler from './httpRequestHandler';
import webServicesHandler from './websocketHandler';
import getAllDetectors from '../lib/getAllDetectors';
import DetectorPluginDelegate from './DetectorPluginDelegate';
import getAllInstructions, { buildInstruction } from '../lib/getAllInstructions';
import SessionTracker from '../lib/SessionTracker';
import IInstruction from '../interfaces/IInstruction';
import IDomainset from '../interfaces/IDomainset';
import BotDetectionResults from '../lib/BotDetectionResults';
import IDetectorModule from '../interfaces/IDetectorModule';
import UserBucketTracker from '../lib/UserBucketTracker';
import UserBucketStats from '../lib/UserBucketStats';
import IDetectionContext from '../interfaces/IDetectionContext';
import DetectionSession from '../lib/DetectionSession';
import * as zlib from 'zlib';
import BrowsersToTest from '@double-agent/profiler/lib/BrowsersToTest';

const certPath = process.env.LETSENCRYPT
  ? '/etc/letsencrypt/live/headers.ulixee.org'
  : __dirname + '/../certs';

const domains = {
  sameSite: process.env.SAME_SITE_DOMAIN ?? 'a1.ulixee-test.org',
  crossSite: process.env.CROSS_SITE_DOMAIN ?? 'a1.dlf.org',
  main: process.env.MAIN_DOMAIN ?? 'a0.ulixee-test.org',
};

export default class DetectionsServer {
  private httpServer: http.Server;
  private httpsServer: https.Server;
  private readonly pluginDelegate: DetectorPluginDelegate;

  private readonly detectors: IDetectorModule[];
  public readonly httpDomains: IDetectionDomains;
  public readonly httpsDomains: IDetectionDomains;

  public sessionTracker: SessionTracker;
  public bucketTracker: UserBucketTracker;

  public browsersToTest = new BrowsersToTest();

  public scraperInstructions: {
    [agent: string]: {
      instructions: IInstruction[];
      index: number;
    };
  } = {};

  constructor(readonly httpPort: number, readonly httpsPort: number, detectRepeatVisits = false) {
    this.httpDomains = {
      main: new URL(`http://${domains.main}:${this.httpPort}`),
      external: new URL(`http://${domains.crossSite}:${this.httpPort}`),
      subdomain: new URL(`http://${domains.sameSite}:${this.httpPort}`),
      isSSL: false,
    };
    this.httpsDomains = {
      main: new URL(`https://${domains.main}:${this.httpsPort}`),
      external: new URL(`https://${domains.crossSite}:${this.httpsPort}`),
      subdomain: new URL(`https://${domains.sameSite}:${this.httpsPort}`),
      isSSL: true,
    };
    this.sessionTracker = new SessionTracker(this.httpDomains, this.httpsDomains);
    this.detectors = getAllDetectors(detectRepeatVisits, true);
    this.pluginDelegate = new DetectorPluginDelegate(this.detectors);
    this.bucketTracker = new UserBucketTracker(this.detectors);
  }

  public async start() {
    console.log('\n\n\nBooting up...');
    this.httpServer = await this.buildServer();
    this.httpsServer = (await this.buildServer(true)) as https.Server;
    await this.pluginDelegate.start(this.httpDomains, this.httpsDomains, this.bucketTracker);
    return this;
  }

  public async createSessionInstructions(scraper: string) {
    if (!this.scraperInstructions[scraper]) {
      this.scraperInstructions[scraper] = {
        instructions: [],
        index: -1,
      };
    }

    const instruction = buildInstruction(this.httpDomains, this.httpsDomains);
    this.scraperInstructions[scraper].instructions.push(instruction);
    this.scraperInstructions[scraper].index = this.scraperInstructions[scraper].instructions.length - 1;

    await this.activateInstruction(instruction, 'freeform');

    return instruction;
  }

  public async nextInstruction(scraper: string) {
    if (!this.scraperInstructions[scraper]) {
      this.scraperInstructions[scraper] = {
        instructions: await getAllInstructions(
          this.httpDomains,
          this.httpsDomains,
          this.browsersToTest,
        ),
        index: -1,
      };
    }

    const details = this.scraperInstructions[scraper];
    details.index += 1;
    if (details.index >= details.instructions.length) {
      // no more
      return null;
    }
    const activeInstruction = details.instructions[details.index];
    await this.activateInstruction(activeInstruction, activeInstruction.useragent);

    return activeInstruction;
  }

  public async saveScraperResults(scraper: string, scraperDir: string) {
    const instructions = this.scraperInstructions[scraper]?.instructions;

    console.log('Saving results for %s', scraper);

    if (!existsSync(scraperDir + '/sessions')) {
      await fs.mkdir(scraperDir + '/sessions', {
        recursive: true,
      });
    } else {
      await cleanDirectory(scraperDir + '/sessions');
    }

    if (!existsSync(scraperDir + '/browser-flags')) {
      await fs.mkdir(scraperDir + '/browser-flags', {
        recursive: true,
      });
    } else {
      await cleanDirectory(scraperDir + '/browser-flags');
    }

    const botDetectionResults = new BotDetectionResults();
    if (!instructions) return botDetectionResults;
    const identityResults = new UserBucketStats();

    for (const instruction of instructions) {
      let session: DetectionSession;
      let tries = 0;
      while (!session) {
        session = this.sessionTracker.getSession(instruction.sessionid);
        if (!session && tries < 200) {
          tries += 1;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      botDetectionResults.trackInstructionResults(instruction, session);
      identityResults.trackInstructionResults(instruction, session);

      await fs.writeFile(
        `${scraperDir}/sessions/${instruction.profileDirName}.json.gz`,
        await this.gzipJson(session),
      );
    }

    const botStats = botDetectionResults.toJSON();
    for (const [browser, categories] of Object.entries(botStats.browserFindings)) {
      // remove legacy file if exists
      if (existsSync(`${scraperDir}/browser-flags/${browser}.json`)) {
        await fs.unlink(`${scraperDir}/browser-flags/${browser}.json`);
      }
      await fs.writeFile(
        `${scraperDir}/browser-flags/${browser}.json.gz`,
        await this.gzipJson(categories),
      );
      for (const [category, entry] of Object.entries(categories)) {
        categories[category] = {
          flagged: entry.flagged,
          checks: entry.checks,
          botPct: entry.botPct,
        } as any;
      }
    }
    await fs.writeFile(`${scraperDir}/botStats.json`, JSON.stringify(botStats, null, 2));
    await fs.writeFile(`${scraperDir}/bucketStats.json`, JSON.stringify(identityResults, null, 2));

    delete this.scraperInstructions[scraper];
    return botDetectionResults;
  }

  protected async stop(): Promise<any> {
    this.httpServer.close();
    this.httpsServer.close();
    await this.pluginDelegate.stop();
  }

  private gzipJson(json: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(JSON.stringify(json, null, 2));
      zlib.gzip(buffer, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  private async activateInstruction(instruction: IInstruction, useragent: string) {
    const session = this.sessionTracker.createSession(useragent);

    addSessionIdToInstruction(instruction, session.id);

    await this.pluginDelegate.onNewInstruction(instruction);
  }

  private getNow() {
    return new Date();
  }

  private getContext(): IDetectionContext {
    return {
      detectors: this.detectors,
      bucketTracker: this.bucketTracker,
      pluginDelegate: this.pluginDelegate,
      sessionTracker: this.sessionTracker,
      getNow: this.getNow,
    };
  }

  private async buildServer(secureDomain: boolean = false) {
    const options = secureDomain
      ? ({
          key: await fs.readFile(certPath + '/privkey.pem'),
          cert: await fs.readFile(certPath + '/fullchain.pem'),
        } as https.ServerOptions)
      : ({} as http.ServerOptions);

    const listeningDomains = secureDomain ? this.httpsDomains : this.httpDomains;
    const domains: IDomainset = {
      listeningDomains,
      secureDomains: this.httpsDomains,
      httpDomains: this.httpDomains,
    };

    const port = listeningDomains.main.port || (listeningDomains.isSSL ? 443 : 80);

    return new Promise<http.Server | https.Server>(resolve => {
      const server = (secureDomain ? https : http).createServer(
        options,
        httpRequestHandler(domains, this.getContext()),
      );
      server
        .on('upgrade', webServicesHandler(domains, this.getContext()))
        .listen(port, () => resolve(server));
    });
  }
}

function addSessionIdToInstruction(instruction: IInstruction, sessionid: string) {
  instruction.sessionid = sessionid;
  for (const page of instruction.pages) {
    page.url = addSessionIdToUrl(page.url, sessionid);
    page.clickDestinationUrl = addSessionIdToUrl(page.clickDestinationUrl, sessionid);
  }
}

function addSessionIdToUrl(url: string, sessionid: string) {
  if (!url) return url;
  const startUrl = new URL(url);
  startUrl.searchParams.set('sessionid', sessionid);
  return startUrl.href;
}

async function cleanDirectory(directory) {
  try {
    const files = await fs.readdir(directory);
    const unlinkPromises = files.map(filename => fs.unlink(`${directory}/${filename}`));
    return Promise.all(unlinkPromises);
  } catch (err) {
    console.log(err);
  }
}
