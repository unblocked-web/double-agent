import AbstractDetectorDriver from '@double-agent/runner/lib/AbstractDetectorDriver';
import IDirective from '@double-agent/runner/lib/IDirective';
import fs from 'fs';
import https from 'https';
import http from 'http';
import httpRequestHandler from './lib/httpRequestHandler';
import webServicesHandler from './lib/webServicesHandler';
import IDomainset, { cleanDomain } from './interfaces/IDomainset';
import Profile from './lib/Profile';
import { isDirectiveMatch, agentToDirective } from '@double-agent/runner/lib/agentHelper';
import { shouldProfileUseragent } from '@double-agent/profiler/lib/getBrowserDirectives';
import { dirname } from "path";

const certPath = process.env.LETSENCRYPT
  ? '/etc/letsencrypt/live/headers.ulixee.org'
  : dirname(require.resolve('@double-agent/runner')) + '/certs';

const domains = {
  sameSite: process.env.SAME_SITE_DOMAIN ?? 'a1.ulixee-test.org',
  crossSite: process.env.CROSS_SITE_DOMAIN ?? 'a1.dlf.org',
  main: process.env.MAIN_DOMAIN ?? 'ulixee-test.org',
};

export default class Detector extends AbstractDetectorDriver {
  protected dirname = __dirname;
  protected directives: IDirective[] = [];

  private httpServer: http.Server;
  private httpsServer: https.Server;

  public etcHostEntries = [domains.main, domains.crossSite, domains.sameSite];

  public async start(getPort: () => number) {
    const httpPort = getPort();
    const httpsPort = getPort();

    const secureMainsite = cleanDomain(domains.main, httpsPort);
    const httpMainsite = cleanDomain(domains.main, httpPort);

    const allprofiles = Profile.getAllProfiles('http').concat(Profile.getAllProfiles('https'));

    // only get each browser once - same results across os
    const seen = new Set<string>();
    for (const profile of allprofiles) {
      const shouldProfile = await shouldProfileUseragent(profile.userAgent);
      if (!shouldProfile) continue;

      if (seen.has(profile.browserAndVersion)) continue;
      seen.add(profile.browserAndVersion);

      const args = {
        ...agentToDirective(profile.userAgent),
        clickItemSelector: '#start',
        waitForElementSelector: '#results.loaded',
      };
      this.directives.push(
        {
          ...args,
          url: `https://${secureMainsite}`,
          clickDestinationUrl: `https://${secureMainsite}/run`,
          requiredFinalUrl: `https://${secureMainsite}/headers`,
        },
        {
          ...args,
          url: `http://${httpMainsite}`,
          clickDestinationUrl: `http://${httpMainsite}/run`,
          requiredFinalUrl: `http://${httpMainsite}/headers`,
        },
      );
    }

    this.httpServer = this.buildServer({
      ...domains,
      isSsl: false,
      port: httpPort,
    });

    this.httpsServer = this.buildServer({
      ...domains,
      isSsl: true,
      port: httpsPort,
    }) as https.Server;
  }

  private onResult(profile: Profile) {
    if (!this.activeDirective) return;
    try {
      const results = profile.testHeaders();
      for (const result of results) {
        if (!result.omitted && result.passed) {
          const isUa = isDirectiveMatch(this.activeDirective, profile.userAgent);

          if (isUa === false) {
            console.log('Directive mismatch', profile.userAgent, result, this.activeDirective);
            result.passed = false;
            result.reason = [result.reason, 'Incorrect User Agent provided']
              .filter(Boolean)
              .join(', ');
          }
        }

        this.recordResult(result.passed, {
          useragent: this.activeDirective.useragent,
          name: [result.resourceType, result.testName].filter(Boolean).join(' - '),
          category: result.category,
          reason: result.reason,
          omitted: result.omitted,
          value: result.value,
          expected: result.expected,
        });
      }
    } catch (err) {
      console.log('ERROR processing header profile', err, this.activeDirective);
    }
  }

  private buildServer(domainset: IDomainset) {
    let options = domainset.isSsl
      ? ({
          key: fs.readFileSync(certPath + '/privkey.pem'),
          cert: fs.readFileSync(certPath + '/fullchain.pem'),
        } as https.ServerOptions)
      : ({} as http.ServerOptions);

    return (domainset.isSsl ? https : http)
      .createServer(options, httpRequestHandler(domainset, this.onResult.bind(this)))
      .on('upgrade', webServicesHandler(domainset))
      .listen(domainset.port, () => {
        console.log(
          `http${domainset.isSsl ? 's' : ''} -> headers started on http${
            domainset.isSsl ? 's' : ''
          }://${domainset.main}:${domainset.port}`,
        );
      });
  }

  protected async stop(): Promise<any> {
    this.httpServer.close();
    this.httpsServer.close();
  }
}
