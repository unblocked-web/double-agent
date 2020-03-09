import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import FingerprintTracker from './lib/FingerprintTracker';
import IFingerprintProfile from './interfaces/IFingerprintProfile';
import * as fs from 'fs';
import FingerprintProfile from './lib/FingerprintProfile';
import fingerprintScript, {
  browserIgnoredAttributes,
  sessionIgnoredAttributes,
} from './fingerprintScript';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';

const filepath = require.resolve('fingerprintjs2/dist/fingerprint2.min.js');

export default class BrowserFingerprintPlugin implements IDetectionPlugin {
  private pluginName = 'browser/fingerprint';
  private browserFingerprints = new FingerprintTracker();
  private sessionFingerprints = new FingerprintTracker();

  public async onRequest(ctx: IRequestContext) {
    if (ctx.requestDetails.resourceType === ResourceType.Document) {
      ctx.extraHead.push(`<script src="fingerprint2.js" type="text/javascript"></script>`);
      ctx.extraScripts.push(fingerprintScript());
    }
  }

  async handleResponse(ctx: IRequestContext) {
    if (ctx.url.pathname === '/fingerprint2.js') {
      ctx.res.writeHead(200, {
        'Content-Type': 'text/javascript',
      });
      fs.createReadStream(filepath).pipe(ctx.res, {
        end: true,
      });
      return true;
    }

    if (ctx.url.pathname === '/fingerprints') {
      const profile = await FingerprintProfile.save(
        ctx.requestDetails.useragent,
        ctx.requestDetails.bodyJson as IFingerprintProfile,
      );

      const { sessionHash, browserHash, components } = profile;

      this.browserFingerprints.hit(browserHash, components);
      this.sessionFingerprints.hit(sessionHash, components);

      const sessionFingerprintName = 'Single Session Browser Fingerprint';
      if (!ctx.session.pluginsRun.push(this.pluginName)) {
        ctx.session.pluginsRun.push(this.pluginName);
        ctx.session.identifiers.push({
          id: profile.browserHash,
          layer: 'browser',
          name: 'Cross-Session Browser Fingerprint',
          description: `Calculates a hash from browser attributes in fingerprint2 that should stay the same regardless of user agent (excludes: ${browserIgnoredAttributes})`,
          raw: profile.components,
        });
        ctx.session.identifiers.push({
          id: profile.sessionHash,
          layer: 'browser',
          name: sessionFingerprintName,
          description: `Calculates a hash from browser attributes in fingerprint2 that should stay the same during a single user session (excludes: ${sessionIgnoredAttributes})`,
          raw: profile.components,
        });
      }

      const priorFingerprint = ctx.session.identifiers.find(x => x.name === sessionFingerprintName);
      if (priorFingerprint) {
        const baseFlag: IFlaggedCheck = {
          pctBot: 100,
          secureDomain: ctx.requestDetails.secureDomain,
          resourceType: ctx.requestDetails.resourceType,
          hostDomain: ctx.requestDetails.hostDomain,
          requestIdx: ctx.session.requests.indexOf(ctx.requestDetails),
          layer: 'browser',
          category: 'Browser Fingerprint',
          expected: priorFingerprint.id,
          checkName: null,
          value: null,
        };
        if (priorFingerprint.id !== profile.sessionHash) {
          ctx.session.flaggedChecks.push({
            ...baseFlag,
            checkName: 'Browser Fingerprint Stable across Session',
            description: 'Checks if a browser fingerprint changes across requests',
            value: profile.sessionHash,
          });
        }
        const storedSessionValue = ctx.requestDetails.cookies['inconspicuous-cookie'] as string;
        if (storedSessionValue && priorFingerprint.id !== storedSessionValue) {
          ctx.session.flaggedChecks.push({
            ...baseFlag,
            checkName: 'Browser Fingerprint Matches Cookie',
            description:
              'Checks if a browser fingerprint stored in a cookie is different than the fingerprint from this request',
            value: storedSessionValue,
          });
        }
      }

      ctx.res.writeHead(200, {
        'Set-Cookie': `inconspicuous-cookie=${profile.sessionHash}; Max-Age=30000`,
      });
      ctx.res.end(JSON.stringify({ success: true }));
      return true;
    }

    return false;
  }
}
