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
import UserBucket from '@double-agent/runner/interfaces/UserBucket';
import { flaggedCheckFromRequest } from '@double-agent/runner/lib/flagUtils';

const filepath = require.resolve('fingerprintjs2/dist/fingerprint2.min.js');

export default class BrowserFingerprintPlugin implements IDetectionPlugin {
  private pluginName = 'browser/fingerprint';
  private browserFingerprints = new FingerprintTracker();
  private sessionFingerprints = new FingerprintTracker();

  public async onRequest(ctx: IRequestContext) {
    if (
      ctx.requestDetails.resourceType === ResourceType.Document &&
      ctx.requestDetails.secureDomain
    ) {
      const page = ctx.url.pathname.replace(/[/\-.]/gi, '_');
      ctx.extraHead.push(
        `<script src="${ctx.trackUrl(`fpjs-${page}.js`)}" type="text/javascript"></script>`,
      );
      ctx.extraScripts.push(fingerprintScript(ctx.trackUrl(`fpres-${page}`)));
    }
  }

  async handleResponse(ctx: IRequestContext) {
    if (ctx.url.pathname.startsWith('/fpjs-')) {
      ctx.res.writeHead(200, {
        'Content-Type': 'text/javascript',
      });
      fs.createReadStream(filepath).pipe(ctx.res, {
        end: true,
      });
      return true;
    }

    if (ctx.url.pathname.startsWith('/fpres-')) {
      const profile = await FingerprintProfile.save(
        ctx.requestDetails.useragent,
        ctx.requestDetails.bodyJson as IFingerprintProfile,
      );

      const { sessionHash, browserHash, components } = profile;

      this.browserFingerprints.hit(browserHash, components);
      this.sessionFingerprints.hit(sessionHash, components);

      if (!ctx.session.pluginsRun.includes(this.pluginName)) {
        ctx.session.pluginsRun.push(this.pluginName);
        ctx.session.identifiers.push({
          id: profile.browserHash,
          layer: 'browser',
          category: 'Browser Fingerprint',
          bucket: UserBucket.Browser,
          description: `Calculates a hash from browser attributes in fingerprint2 that should stay the same regardless of user agent (excludes: ${browserIgnoredAttributes})`,
        });
        ctx.session.identifiers.push({
          id: profile.sessionHash,
          layer: 'browser',
          category: 'Browser Fingerprint',
          bucket: UserBucket.BrowserSingleSession,
          description: `Calculates a hash from browser attributes in fingerprint2 that should stay the same during a single user session (excludes: ${sessionIgnoredAttributes})`,
        });
      }

      const priorFingerprint = ctx.session.identifiers.find(
        x => x.bucket === UserBucket.BrowserSingleSession,
      );
      if (priorFingerprint) {
        ctx.session.recordCheck(priorFingerprint.id !== profile.sessionHash, {
          ...flaggedCheckFromRequest(ctx, 'browser', 'Browser Fingerprint'),
          pctBot: 100,
          checkName: 'Browser Fingerprint Stable across Session',
          description: 'Checks if a browser fingerprint changes across requests',
          value: profile.sessionHash,
          expected: priorFingerprint.id,
        });

        const storedSessionValue = ctx.requestDetails.cookies['inconspicuous-cookie'] as string;
        ctx.session.recordCheck(storedSessionValue && priorFingerprint.id !== storedSessionValue, {
          ...flaggedCheckFromRequest(ctx, 'browser', 'Browser Fingerprint'),
          pctBot: 100,
          checkName: 'Browser Fingerprint Matches Cookie',
          description:
            'Checks if a browser fingerprint stored in a cookie is different than the fingerprint from this request',
          value: storedSessionValue,
          expected: priorFingerprint.id,
        });
      }

      ctx.res.writeHead(200, {
        'Set-Cookie': `inconspicuous-cookie=${profile.sessionHash}; Max-Age=30000; Secure; HttpOnly;`,
      });
      ctx.res.end(JSON.stringify({ success: true }));
      return true;
    }

    return false;
  }
}
