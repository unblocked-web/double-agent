import http from 'http';
import https from 'https';
import { existsSync, promises as fs } from 'fs';
import { URL } from 'url';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import httpRequestHandler from './httpRequestHandler';
import webServicesHandler from './websocketHandler';
import getAllDetectors from '../lib/getAllDetectors';
import DetectorPluginDelegate from './DetectorPluginDelegate';
import getAllDirectives, { buildDirective } from '../lib/getAllDirectives';
import SessionTracker from '../lib/SessionTracker';
import IDirective from '../interfaces/IDirective';
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

  public scraperDirectives: {
    [agent: string]: {
      directives: IDirective[];
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

  public async createSessionDirectives(scraper: string) {
    if (!this.scraperDirectives[scraper]) {
      this.scraperDirectives[scraper] = {
        directives: [],
        index: -1,
      };
    }

    const directive = buildDirective(this.httpDomains, this.httpsDomains);
    this.scraperDirectives[scraper].directives.push(directive);
    this.scraperDirectives[scraper].index = this.scraperDirectives[scraper].directives.length - 1;

    await this.activateDirective(directive, 'freeform');

    return directive;
  }

  public async nextDirective(scraper: string) {
    if (!this.scraperDirectives[scraper]) {
      this.scraperDirectives[scraper] = {
        directives: await getAllDirectives(
          this.httpDomains,
          this.httpsDomains,
          this.browsersToTest,
        ),
        index: -1,
      };
    }

    const details = this.scraperDirectives[scraper];
    details.index += 1;
    if (details.index >= details.directives.length) {
      // no more
      return null;
    }
    const activeDirective = details.directives[details.index];
    await this.activateDirective(activeDirective, activeDirective.useragent);

    return activeDirective;
  }

  public async saveScraperResults(scraper: string, scraperDir: string) {
    const directives = this.scraperDirectives[scraper]?.directives;

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
    if (!directives) return botDetectionResults;
    const identityResults = new UserBucketStats();

    for (const directive of directives) {
      let session: DetectionSession;
      let tries = 0;
      while (!session) {
        session = this.sessionTracker.getSession(directive.sessionid);
        if (!session && tries < 200) {
          tries += 1;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      botDetectionResults.trackDirectiveResults(directive, session);
      identityResults.trackDirectiveResults(directive, session);

      await fs.writeFile(
        `${scraperDir}/sessions/${directive.browserGrouping}.json.gz`,
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

    delete this.scraperDirectives[scraper];
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

  private async activateDirective(directive: IDirective, useragent: string) {
    const session = this.sessionTracker.createSession(useragent);

    addSessionIdToDirective(directive, session.id);

    await this.pluginDelegate.onNewDirective(directive);
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

function addSessionIdToDirective(directive: IDirective, sessionid: string) {
  directive.sessionid = sessionid;
  for (const page of directive.pages) {
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
