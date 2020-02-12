import http, { ServerResponse } from 'http';
import useragent from 'useragent';
import trackRemoteTcpVars from './trackRemoteTcpVars';
import AbstractDetectorDriver from '@double-agent/runner/lib/AbstractDetectorDriver';
import IDirective from '@double-agent/runner/lib/IDirective';
import { isDirectiveMatch } from '@double-agent/runner/lib/agentHelper';

const hops = 20;

export default class Detector extends AbstractDetectorDriver {
  private server: http.Server;
  private port: number;

  private getRemoteTcpVarsForAddress: (
    remoteAddress: string,
  ) => Promise<{ windowSize: number; ttl: number }>;
  private closeTracker: () => void;

  protected directives: IDirective[];

  public etcHostEntries = ['ulixee-test.org'];

  public async start(getPort: () => number) {
    this.port = getPort();
    const url = `http://ulixee-test.org:${this.port}`;
    const browser = 'Chrome';
    this.directives = [
      {
        os: 'Linux',
        browser,
        url,
        waitForElementSelector: '#results',
        useragent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36',
      },
      {
        os: 'Windows',
        browser,
        url,
        waitForElementSelector: '#results',
        useragent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.16 Safari/537.36',
      },
      {
        os: 'Mac OS X',
        browser,
        url,
        waitForElementSelector: '#results',
        useragent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36',
      },
    ];

    const tracker = trackRemoteTcpVars(this.port);
    this.getRemoteTcpVarsForAddress = tracker.getPacket;
    this.closeTracker = tracker.stop;
    return new Promise<void>(resolve => {
      this.server = http.createServer(this.serverListener.bind(this)).listen(this.port, () => {
        console.log('Tcp->Ttl test started on %s', this.server.address());
        resolve();
      });
    });
  }

  public async stop() {
    this.closeTracker();
    this.server.close();
  }

  protected recordFailure(reason: string, useragent?: string) {
    this.recordResult(false, {
      name: 'ttl',
      useragent,
      reason,
    });
    this.recordResult(false, {
      name: 'windowSize',
      useragent,
      reason,
    });
  }

  private async serverListener(req: http.IncomingMessage, res: ServerResponse) {
    const userAgent = req.headers['user-agent'];
    const addr = req.connection.remoteAddress.split(':').pop() + ':' + req.connection.remotePort;

    const packet = await this.getRemoteTcpVarsForAddress(addr);
    if (!userAgent) {
      this.recordFailure('No user agent provided');
      res.writeHead(400, {
        'content-type': 'text/html',
      });
      res.write('<html><body><bold style="color:red">No user agent provided</bold></body></html>');
      return res.end();
    }
    if (this.activeDirective) {
      if (!isDirectiveMatch(this.activeDirective, userAgent)) {
        this.recordFailure('Wrong user agent provided', userAgent);
        res.writeHead(400, {
          'content-type': 'text/html',
        });
        res.write(
          '<html><body><bold style="color:red">Wrong user agent provided</bold></body></html>',
        );
        return res.end();
      }
    }

    let windowSizes: number[];
    let ttl: number;
    const ua = useragent.lookup(userAgent);
    if (ua.os.family === 'Mac OS X') {
      [ttl, ...windowSizes] = ttlWindowValues['Mac OS X'];
    } else if (ua.os.family === 'Windows' && Number(ua.os.major) >= 7) {
      [ttl, ...windowSizes] = ttlWindowValues.Windows;
    } else if (ua.os.family === 'Windows') {
      [ttl, ...windowSizes] = ttlWindowValues.WindowsXp;
    } else {
      [ttl, ...windowSizes] = ttlWindowValues.Linux;
    }

    // allow some leeway for router hops that decrement ttls
    const ttlDiff = ttl - packet.ttl;

    this.recordResult(ttlDiff < hops && ttlDiff >= 0, {
      name: 'ttl',
      value: packet.ttl,
      expected: ttl,
      useragent: userAgent,
    });
    this.recordResult(windowSizes.includes(packet.windowSize), {
      name: 'windowSize',
      value: packet.windowSize,
      expected: windowSizes.join(','),
      useragent: userAgent,
    });

    const isConfirmed = ttlDiff >= 0 && ttlDiff < hops && windowSizes.includes(packet.windowSize);
    console.log('Session for %s. Confirmed?: %s', addr, isConfirmed, packet);

    res.writeHead(200, {
      'content-type': 'text/html',
    });
    res.write(`<html><body id="results">
<h1>Tcp Packet Analysis</h1>
<h2 ${isConfirmed ? `style='color:green'>C` : "style='color:orange'>Unc"}onfirmed</h2>
<h3>Os: ${ua.os.family}</h2>
<p>Ttl: ${packet.ttl}. Expected: ${ttl} within ${hops} hops.</p>
<p>Window Size: ${packet.windowSize}. Expected: ${windowSizes.join(', ')}</p>
</body></html>`);
    res.end();
  }
}

const ttlWindowValues = {
  'Mac OS X': [64, 65535],
  Linux: [64, 5840, 29200, 5720],
  WindowsXp: [128, 65535],
  Windows: [128, 8192],
};
