import AbstractDetectorDriver from '@double-agent/runner/lib/AbstractDetectorDriver';
import IDirective from '@double-agent/runner/lib/IDirective';
import { agentToDirective } from '@double-agent/runner/lib/agentHelper';
import FingerprintTracker from './lib/FingerprintTracker';
import IFingerprintProfile from './interfaces/IFingerprintProfile';
import FingerprintServer from './lib/FingerprintServer';
import FingerprintProfile from './lib/FingerprintProfile';

const domain = process.env.DOMAIN ?? 'ulixee-test.org';

export default class Detector extends AbstractDetectorDriver {
  private server: FingerprintServer;
  protected directives: IDirective[] = [];

  protected dirname = __dirname;
  public etcHostEntries = [domain];

  private browserFingerprints = new FingerprintTracker();
  private fullFingerprints = new FingerprintTracker();
  private stableFingerprints = new FingerprintTracker();
  private stableFingerprintChanges = 0;

  public async nextDirective(): Promise<IDirective> {
    this.activeDirective = this.directives.shift();
    if (!this.activeDirective) {
      this.recordFingerprint({
        category: 'Browser Fingerprint',
        name: 'Full',
        ...this.fullFingerprints.toProfile(),
      });

      this.recordFingerprint({
        category: 'Browser Fingerprint',
        name: 'Cross Browser (no Useragent)',
        ...this.browserFingerprints.toProfile(true),
      });

      // NOTE: not recording stable since it has no differences

      // reset stats
      this.browserFingerprints.reset();
      this.stableFingerprints.reset();
      this.fullFingerprints.reset();
      this.stableFingerprintChanges = 0;
    }
    return this.activeDirective;
  }

  public async start(getPort: () => number) {
    const port = getPort();

    const profiles = await FingerprintProfile.readAll();
    if (profiles.length) {
      for (let i = 0; i < 100; i += 1) {
        const randomAgent = profiles[i % profiles.length].useragent;
        this.directives.push({
          ...agentToDirective(randomAgent),
          url: `http://${domain}:${port}`,
          waitForElementSelector: 'body.done',
        });
      }
    }

    this.server = new FingerprintServer((profile, stableHashFromCookie) => {
      this.recordFingerprintCounts(profile, stableHashFromCookie);
    });

    await this.server.start(port, domain);
  }

  protected stop() {
    this.server.close();
  }

  private recordFingerprintCounts(profile: IFingerprintProfile, stableHashFromCookie?: string) {
    const { stableHash, fullHash, browserHash, components } = profile;
    const fullHits = this.fullFingerprints.hit(fullHash, components);
    const browserHits = this.browserFingerprints.hit(browserHash, components);
    const stableHits = this.stableFingerprints.hit(stableHash, components);

    if (stableHashFromCookie && stableHashFromCookie !== stableHash) {
      this.stableFingerprintChanges += 1;
    }

    console.log(
      'Results for %s. Seen full: %s, stable: %s, browser: %s. Changed in this browser? %s',
      profile.useragent,
      fullHits,
      stableHits,
      browserHits,
      this.stableFingerprintChanges > 1,
    );
  }
}
