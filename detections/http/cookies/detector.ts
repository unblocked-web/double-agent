import AbstractDetectorDriver from '@double-agent/runner/lib/AbstractDetectorDriver';
import IDirective from '@double-agent/runner/lib/IDirective';
import fs from 'fs';
import https from 'https';
import http from 'http';
import httpRequestHandler from './lib/httpRequestHandler';
import IDomainset, { cleanDomain } from './interfaces/IDomainset';
import CookieProfile from './lib/CookieProfile';
import { isDirectiveMatch } from '@double-agent/runner/lib/agentHelper';
import testCookieProfile from './lib/testCookieProfile';
import getBrowserDirectives from '@double-agent/profiler/lib/getBrowserDirectives';
import { dirname } from 'path';

const certPath = process.env.LETSENCRYPT
  ? '/etc/letsencrypt/live/headers.ulixee.org'
  : dirname(require.resolve('@double-agent/runner')) + '/certs';

const domains = {
  sameSite: process.env.SAME_SITE_DOMAIN ?? 'a1.ulixee-test.org',
  crossSite: process.env.CROSS_SITE_DOMAIN ?? 'a1.dlf.org',
  main: process.env.MAIN_DOMAIN ?? 'ulixee-test.org',
};

let counter = 0;
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

    const secureCrosssite = cleanDomain(domains.crossSite, httpsPort);
    const httpCrosssite = cleanDomain(domains.crossSite, httpPort);

    const allprofiles = CookieProfile.findUniqueProfiles('http').concat(
      CookieProfile.findUniqueProfiles('https'),
    );

    // CookieProfile.analyzeUniquePropertiesByBrowserGroup('http');
    // CookieProfile.analyzeUniquePropertiesByBrowserGroup('https');

    const directives = await getBrowserDirectives(allprofiles);
    for (const { directive, profile } of directives) {
      const baseUrl =
        profile.type === 'https' ? `https://${secureMainsite}` : `http://${httpMainsite}`;
      const crossSiteUrl =
        profile.type === 'https' ? `https://${secureCrosssite}` : `http://${httpCrosssite}`;

      const hkey = (counter += 1);
      this.directives.push({
        ...directive,
        clickItemSelector: '#start',
        requiredFinalClickSelector: '#results',
        waitForElementSelector: '#final',
        url: baseUrl + '/?hkey=' + hkey,
        clickDestinationUrl: `${baseUrl}/run?hkey=${hkey}`,
        requiredFinalUrl: `${crossSiteUrl}/results?hkey=${hkey}`,
      });
    }

    const httpDomains = {
      ...domains,
      isSsl: false,
      port: httpPort,
    };

    const httpsDomains = {
      ...domains,
      isSsl: true,
      port: httpsPort,
    };

    this.httpServer = this.buildServer(httpDomains, httpsDomains);
    this.httpsServer = this.buildServer(httpsDomains, httpDomains) as https.Server;
  }

  private onResult(profile: CookieProfile) {
    if (!this.activeDirective) return;
    try {
      const results = testCookieProfile(profile);
      for (const result of results) {
        if (!result.omitted && result.success) {
          const isUa = isDirectiveMatch(this.activeDirective, profile.useragent);

          if (isUa === false) {
            console.log('Directive mismatch', profile.useragent, result, this.activeDirective);
            result.success = false;
            result.reason = [result.reason, 'Incorrect User Agent provided']
              .filter(Boolean)
              .join(', ');
          }
        }

        this.recordResult(result.success, {
          useragent: this.activeDirective.useragent,
          name: result.testName,
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

  private buildServer(domainset: IDomainset, otherDomains: IDomainset) {
    let options = domainset.isSsl
      ? ({
          key: fs.readFileSync(certPath + '/privkey.pem'),
          cert: fs.readFileSync(certPath + '/fullchain.pem'),
        } as https.ServerOptions)
      : ({} as http.ServerOptions);

    console.log('launching server on ', domainset);
    return (domainset.isSsl ? https : http)
      .createServer(options, httpRequestHandler(domainset, otherDomains, this.onResult.bind(this)))
      .listen(domainset.port, () => {
        console.log(
          `http${domainset.isSsl ? 's' : ''} -> cookies started on http${
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
