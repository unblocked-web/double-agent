import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import ForkedServerRunner from './lib/ForkedServerRunner';
import ITlsResult from './interfaces/ITlsResult';
import { isGreased } from './lib/buildJa3Extended';
import IDirective from '@double-agent/runner/interfaces/IDirective';
import { getUseragentPath } from '@double-agent/runner/lib/useragentProfileHelper';
import IFlaggedCheck from '@double-agent/runner/interfaces/IFlaggedCheck';
import ClientHelloProfile from './lib/ClientHelloProfile';

let tlsPort = Number(process.env.PORT ?? 3002);
const tlsDomain = `https://${process.env.TLS_DOMAIN ?? 'tls.ulixee-test.org'}`;

export default class TlsClientHelloPlugin implements IDetectionPlugin {
  private forkedServers = new Map<string, ForkedServerRunner>();
  private sessionTlsResults = new Map<string, ITlsResult>();

  public async onNewDirective(directive: IDirective) {
    const forkedServer = new ForkedServerRunner();
    const presitePort = (tlsPort += 1);
    const sessionid = directive.sessionid;
    await forkedServer.start(
      presitePort,
      result => this.onTlsResult(result, sessionid),
      directive.pages[0].url,
    );
    this.forkedServers.set(sessionid, forkedServer);
    directive.pages.unshift({
      url: new URL(`${tlsDomain}:${presitePort}/?sessionid=${sessionid}`).href,
      clickSelector: '#goto-start-page',
    });
  }

  public async stop() {
    for (const server of this.forkedServers) {
      server[1].stop();
    }
  }

  public async onRequest(ctx: IRequestContext) {
    const tlsResult = this.sessionTlsResults.get(ctx.session.id);

    if (!tlsResult) return;

    ctx.session.identifiers.push({
      raw: tlsResult.ja3Extended,
      name: 'TLS Fingerprint',
      layer: 'tls',
      id: tlsResult.ja3ExtendedMd5,
    });

    this.sessionTlsResults.delete(ctx.session.id);
    const expected = ClientHelloProfile.confirmedJa3s.find(
      x => getUseragentPath(x.useragent) === getUseragentPath(tlsResult.useragent),
    );
    if (!expected) {
      console.log('No tls profile for user agent', tlsResult.useragent);
      return;
    }
    const check = {
      value: tlsResult.ja3Extended,
      requestIdx: ctx.session.requests.indexOf(ctx.requestDetails),
      originType: ctx.requestDetails.originType,
      hostDomain: ctx.requestDetails.hostDomain,
      resourceType: ctx.requestDetails.resourceType,
      layer: 'tls',
      category: 'TLS Initial Handshake',
      checkName: 'TLS Fingerprint Match',
      description: 'Checks that the tls client hello signature matches the provided user agent',
    } as IFlaggedCheck;

    if (!tlsResult.match) {
      ctx.session.flaggedChecks.push({
        ...check,
        expected: expected.ja3Extended,
        pctBot: 100,
        details:
          tlsResult.reason ??
          (tlsResult.ja3MatchFor?.length
            ? `Provided ja3 signature matches: [${tlsResult.ja3MatchFor.join(', ')}]`
            : tlsResult.ja3erMatchFor ?? 'Not a match for known browser signatures'),
      });
    }

    const shouldBeGreased = isGreased(expected.ja3Extended);
    if (shouldBeGreased !== tlsResult.hasGrease) {
      ctx.session.flaggedChecks.push({
        ...check,
        value: tlsResult.hasGrease,
        category: 'TLS Grease Used',
        checkName: 'TLS Grease in ClientHello',
        expected: shouldBeGreased,
        pctBot: 100,
      });
    }
    ctx.session.pluginsRun.push(`tls/clienthello`);
  }

  private onTlsResult(message: ITlsResult, sessionid: string) {
    if (!message.useragent || this.sessionTlsResults.has(sessionid)) {
      return;
    }
    ClientHelloProfile.saveProfile({
      useragent: message.useragent,
      ja3: message.ja3,
      ja3Md5: message.ja3Md5,
      ja3Extended: message.ja3Extended,
      ja3ExtendedMd5: message.ja3ExtendedMd5,
      clientHello: message.clientHello,
    });
    this.sessionTlsResults.set(sessionid, message);

    setTimeout(childServer => childServer.stop(), 500, this.forkedServers.get(sessionid));
    this.forkedServers.delete(sessionid);
  }
}
