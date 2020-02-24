import http, { ServerResponse } from 'http';
import https from 'https';
import trackRemoteTcpVars from './lib/trackRemoteTcpVars';
import AbstractDetectorDriver from '@double-agent/runner/lib/AbstractDetectorDriver';
import IDirective from '@double-agent/runner/lib/IDirective';
import { isDirectiveMatch } from '@double-agent/runner/lib/agentHelper';
import TcpProfile from './lib/TcpProfile';
import fs from 'fs';
import getBrowserDirectives from '@double-agent/profiler/lib/getBrowserDirectives';
import { dirname } from 'path';

const certPath = process.env.LETSENCRYPT
  ? '/etc/letsencrypt/live/tls.ulixee.org'
  : dirname(require.resolve('@double-agent/runner')) + '/certs';

export default class Detector extends AbstractDetectorDriver {
  private server: https.Server;
  private port: number;

  private getRemoteTcpVarsForAddress: (
    remoteAddress: string,
  ) => Promise<{ windowSize: number; ttl: number }>;
  private closeTracker: () => void;

  protected directives: IDirective[] = [];
  protected dirname = __dirname;

  public etcHostEntries = ['ulixee-test.org'];

  public async start(getPort: () => number) {
    this.port = getPort();
    const url = `https://ulixee-test.org:${this.port}`;
    const uniqueProfiles = TcpProfile.findUniqueProfiles();
    const directives = await getBrowserDirectives(Object.values(uniqueProfiles));
    for (const { directive } of directives) {
      this.directives.push({
        ...directive,
        url,
        isOsTest: true,
      });
    }

    const tracker = trackRemoteTcpVars(this.port);
    this.getRemoteTcpVarsForAddress = tracker.getPacket;
    this.closeTracker = tracker.stop;
    return new Promise<void>(resolve => {
      this.server = https
        .createServer(
          {
            key: fs.readFileSync(certPath + '/privkey.pem'),
            cert: fs.readFileSync(certPath + '/fullchain.pem'),
          },
          this.serverListener.bind(this),
        )
        .listen(this.port, () => {
          console.log('TCP->Ttl test started on %s', this.server.address());
          resolve();
        });
    });
  }

  public async stop() {
    this.closeTracker();
    this.server.close();
  }

  private async serverListener(req: http.IncomingMessage, res: ServerResponse) {
    const userAgent = req.headers['user-agent'];
    const addr = req.connection.remoteAddress.split(':').pop() + ':' + req.connection.remotePort;

    if (req.url !== '/') {
      return res.writeHead(200).end();
    }

    const packet = await this.getRemoteTcpVarsForAddress(addr);
    if (!userAgent) {
      this.directiveNotRun('No user agent provided');
      res.writeHead(400, {
        'content-type': 'text/html',
      });
      res.write('<html><body><bold style="color:red">No user agent provided</bold></body></html>');
      return res.end();
    }
    if (this.activeDirective) {
      if (!isDirectiveMatch(this.activeDirective, userAgent)) {
        this.directiveNotRun('Wrong user agent provided');
        res.writeHead(400, {
          'content-type': 'text/html',
        });
        res.write(
          '<html><body><bold style="color:red">Wrong user agent provided</bold></body></html>',
        );
        return res.end();
      }
    }

    const profile = new TcpProfile(userAgent, packet.ttl, packet.windowSize);
    await profile.save();

    const results = profile.test();
    for (const result of results) {
      if (this.activeDirective) {
        this.recordResult(result.success, result);
      }
    }

    const isConfirmed = results.filter(x => x.success).length === results.length;
    console.log('Session for %s at %s. Confirmed?: %s', userAgent, addr, isConfirmed, packet);
    const ttlResult = results.find(x => x.name === 'Packet TTL');
    const winsizeResult = results.find(x => x.name === 'Packet WindowSize');

    res.writeHead(200, {
      'content-type': 'text/html',
    });
    res.write(`<html><body id="results">
<h1>TCP Packet Analysis</h1>
<h2 ${isConfirmed ? `style='color:green'>C` : "style='color:orange'>Unc"}onfirmed</h2>

<p>Ttl: ${packet.ttl}. Expected: ${ttlResult?.expected} within ${TcpProfile.allowedHops} hops.</p>
<p>Window Size: ${packet.windowSize}. Expected: ${winsizeResult?.expected}</p>
</body></html>`);
    res.end();
  }
}
