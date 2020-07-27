import http from 'http';
import https from 'https';
import { promises as fs } from 'fs';
import { URL } from 'url';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import httpRequestHandler from './httpRequestHandler';
import webServicesHandler from './websocketHandler';
import getAllDetectors from '../lib/getAllDetectors';
import DetectorPluginDelegate from './DetectorPluginDelegate';
import SessionTracker from '../lib/SessionTracker';
import IDomainset from '../interfaces/IDomainset';
import IDetectorModule from '../interfaces/IDetectorModule';
import UserBucketTracker from '../lib/UserBucketTracker';
import IDetectionContext from '../interfaces/IDetectionContext';

const certPath = process.env.LETSENCRYPT
  ? '/etc/letsencrypt/live/headers.ulixee.org'
  : __dirname + '/../certs';

const domains = {
  sameSite: process.env.SAME_SITE_DOMAIN ?? 'a1.ulixee-test.org',
  crossSite: process.env.CROSS_SITE_DOMAIN ?? 'a1.dlf.org',
  main: process.env.MAIN_DOMAIN ?? 'a0.ulixee-test.org',
};

export default class DetectionsServer {
  public httpServer: http.Server;
  private httpsServer: https.Server;
  private readonly detectors: IDetectorModule[];

  public readonly pluginDelegate: DetectorPluginDelegate;
  public readonly httpDomains: IDetectionDomains;
  public readonly httpsDomains: IDetectionDomains;

  public sessionTracker: SessionTracker;
  public bucketTracker: UserBucketTracker;

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

  protected async stop(): Promise<any> {
    this.httpServer.close();
    this.httpsServer.close();
    await this.pluginDelegate.stop();
  }
}
