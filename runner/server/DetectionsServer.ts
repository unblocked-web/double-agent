import http from 'http';
import https from 'https';
import fs from 'fs';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import httpRequestHandler from './httpRequestHandler';
import webServicesHandler from './websocketHandler';
import getAllDetectors from '../lib/getAllDetectors';
import DetectorPluginDelegate from './DetectorPluginDelegate';
import getAllDirectives, { buildDirective } from '../lib/getAllDirectives';
import SessionTracker from '../lib/SessionTracker';
import IDirective from '../interfaces/IDirective';
import IDomainset from '../interfaces/IDomainset';

const certPath = process.env.LETSENCRYPT
  ? '/etc/letsencrypt/live/headers.ulixee.org'
  : __dirname + '/../certs';

const domains = {
  sameSite: process.env.SAME_SITE_DOMAIN ?? 'a1.ulixee-test.org',
  crossSite: process.env.CROSS_SITE_DOMAIN ?? 'a1.dlf.org',
  main: process.env.MAIN_DOMAIN ?? 'ulixee-test.org',
};

export default class DetectionsServer {
  private httpServer: http.Server;
  private httpsServer: https.Server;
  private readonly pluginDelegate: DetectorPluginDelegate;

  public readonly httpDomains: IDetectionDomains;
  public readonly httpsDomains: IDetectionDomains;

  public sessionTracker: SessionTracker;

  public scraperDirectives: {
    [agent: string]: {
      directives: IDirective[];
      index: number;
    };
  } = {};

  constructor(readonly httpPort: number, readonly httpsPort: number) {
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
    const detectors = getAllDetectors(true);
    this.pluginDelegate = new DetectorPluginDelegate(detectors);
  }

  public async start() {
    console.log('\n\n\nBooting up...');
    this.httpServer = await this.buildServer();
    this.httpsServer = (await this.buildServer(true)) as https.Server;
    await this.pluginDelegate.start(this.httpDomains, this.httpsDomains);

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
        directives: await getAllDirectives(this),
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

  protected async stop(): Promise<any> {
    this.httpServer.close();
    this.httpsServer.close();
    await this.pluginDelegate.stop();
  }

  private async activateDirective(directive: IDirective, useragent: string) {
    const session = this.sessionTracker.createSession(useragent);

    addSessionIdToDirective(directive, session.id);

    await this.pluginDelegate.onNewDirective(directive);
  }

  private async buildServer(secureDomain: boolean = false) {
    const options = secureDomain
      ? ({
          key: fs.readFileSync(certPath + '/privkey.pem'),
          cert: fs.readFileSync(certPath + '/fullchain.pem'),
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
        httpRequestHandler(this.pluginDelegate, domains, this.sessionTracker),
      );
      server
        .on('upgrade', webServicesHandler(this.pluginDelegate, domains, this.sessionTracker))
        .listen(port, () => resolve(server));
    });
  }
}

function addSessionIdToDirective(directive: IDirective, sessionid: string) {
  directive.sessionid = sessionid;
  for (const page of directive.pages) {
    page.url = addSessionIdToUrl(page.url, sessionid);
  }
}

function addSessionIdToUrl(url: string, sessionid: string) {
  if (!url) return url;
  const startUrl = new URL(url);
  startUrl.searchParams.set('sessionid', sessionid);
  return startUrl.href;
}
