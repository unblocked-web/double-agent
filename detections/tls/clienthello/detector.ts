import ITlsResult from './interfaces/ITlsResult';
import AbstractDetectorDriver from '@double-agent/runner/lib/AbstractDetectorDriver';
import IDirective from '@double-agent/runner/lib/IDirective';
import { confirmedJa3s, saveJa3Profile, uniqueConfirmedJa3s } from './profiles';
import { isDirectiveMatch } from '@double-agent/runner/lib/agentHelper';
import * as http from 'http';
import ForkedServerRunner from './lib/ForkedServerRunner';
import { isGreased } from './lib/buildJa3Extended';
import getBrowserDirectives from '@double-agent/profiler/lib/getBrowserDirectives';
import { inspect } from 'util';

const domain = process.env.DOMAIN ?? 'ulixee-test.org';
/**
 * This is a hack-approach to decoding the client hello message for a tls handshake.
 *
 * It currently relies on the fact that you can turn on "Trace" for openssl tls connections that
 * underpin nodejs tls connections. So there are 2 major problems: 1) we have to parse unstructured output
 * from openssl that could change, and 2) the trace output isn't guaranteed, and occasionally just
 * decides not to print out.
 *
 * HOW TO FIX:
 * A future solution should do the actual work to decode the clienthello message. PcapPlusPlus could
 * be a good solution either natively in c++ or with a node binding.
 *
 * TODO: this current test does not detect session tickets and/or PSKs in place of padding. TBD if these
 *       should factor into the same signature or there should be additional tests for reconnect. Sort of seems like
 *       you either have a working TLS implementation underneath or you don't. Are you really going to build a "fake"
 *       initial connect but skip out on continuation of tls sessions?
 */
export default class Detector extends AbstractDetectorDriver {
  private startServer: http.Server;
  private port: number;
  private getPort: () => number;

  private tlsServers: ForkedServerRunner[] = [];

  protected directives: IDirective[] = [];

  protected dirname = __dirname;
  public etcHostEntries = [domain];

  public async nextDirective() {
    const child = this.tlsServers.shift();
    if (child) child.stop();

    const next = await super.nextDirective();
    if (next) {
      const forkPort = await this.createForkedServer();
      next.clickDestinationUrl = `https://${domain}:${forkPort}`;
    }
    return next;
  }

  public async start(getPort: () => number) {
    this.getPort = getPort;
    this.port = getPort();
    let serverStarted: () => void;
    const promise = new Promise(resolve => (serverStarted = resolve));
    this.startServer = http
      .createServer(async (req, res) => {
        let forkPort: number;
        if (req.url === '/new' || !this.tlsServers.length) {
          console.log(
            'New test being created for %s:%s',
            req.connection.remoteAddress,
            req.connection.remotePort,
          );
          forkPort = await this.createForkedServer();
        } else if (req.url !== '/') {
          return res.writeHead(404).end();
        }

        if (!forkPort) {
          forkPort = this.tlsServers[this.tlsServers.length - 1].port;
        }
        return res.writeHead(200).end(`
<html>
<body>
<h3>Click to get started</h3>
<a href="https://${domain}:${forkPort}" id="start">start</a>
</body>
</html>`);
      })
      .listen(this.port, () => {
        console.log('TLS clienthello start server started at http://%s:%s', domain, this.port);
        serverStarted();
      });

    const directives = await getBrowserDirectives(Object.values(uniqueConfirmedJa3s));
    for (const { directive } of directives) {
      this.directives.push({
        url: `http://${domain}:${this.port}`,
        clickItemSelector: '#start',
        ...directive,
      });
    }
    console.log('Tls ClientHello Directives', this.directives);

    await promise;
  }

  public async createForkedServer() {
    const child = this.tlsServers.shift();
    if (child) child.stop();

    const fork = new ForkedServerRunner();
    const forkPort = this.getPort();
    await fork.start(forkPort, this.onTlsResult.bind(this));
    this.tlsServers.push(fork);
    return forkPort;
  }

  protected stop() {
    this.startServer.close();
  }

  private onTlsResult(message: ITlsResult) {
    saveJa3Profile({
      useragent: message.useragent,
      ja3: message.ja3,
      ja3Md5: message.ja3Md5,
      ja3Extended: message.ja3Extended,
      ja3ExtendedMd5: message.ja3ExtendedMd5,
      clientHello: message.clientHello,
    });

    if (this.activeDirective) {
      // make sure user agent matches the actual test
      if (message.match) {
        const isRightUa = isDirectiveMatch(this.activeDirective, message.useragent);
        if (isRightUa === false) {
          message.match = false;
          message.reason = 'Wrong user agent presented';
        }
      }

      const expected = confirmedJa3s.find(x => x.useragent === message.useragent);
      if (!expected) {
        console.log('couldnt find j3 for agent', message.useragent)
      }
      this.recordResult(message.match, {
        category: 'TLS Initial Handshake',
        name: 'TLS Fingerprint Match',
        useragent: message.useragent,
        value: message.ja3Extended,
        expected: expected.ja3Extended,
        reason:
          message.reason ??
          (message.ja3MatchFor?.length
            ? `Provided ja3 signature matches: [${message.ja3MatchFor.join(', ')}]`
            : message.ja3erMatchFor ?? 'Not a match for known browser signatures'),
      });

      const shouldBeGreased = isGreased(expected.ja3Extended);
      this.recordResult(shouldBeGreased === message.hasGrease, {
        category: 'TLS Grease Used',
        name: 'TLS Grease in ClientHello',
        useragent: message.useragent,
        value: String(message.hasGrease),
        expected: String(shouldBeGreased),
        reason: message.reason,
      });
    }
  }
}
