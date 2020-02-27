import * as http from 'http';
import * as fs from 'fs';
import cookie from 'cookie';
import FingerprintProfile from './FingerprintProfile';
import IFingerprintProfile from '../interfaces/IFingerprintProfile';

export default class FingerprintServer {
  private server: http.Server;

  constructor(
    readonly onProfile: (profile: IFingerprintProfile, stableHashFromCookie?: string) => void,
  ) {}

  public async start(port: number, domain: string) {
    let serverStarted: () => void;
    const promise = new Promise(resolve => (serverStarted = resolve));
    this.server = http.createServer(this.requestHandler.bind(this)).listen(port, () => {
      console.log('Browser fingerprint start server started at http://%s:%s', domain, port);
      serverStarted();
    });
    await promise;
  }

  public close() {
    this.server.close();
  }

  private async requestHandler(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.url === '/fingerprint2.js') {
      const filepath = require.resolve('fingerprintjs2/dist/fingerprint2.min.js');

      res.writeHead(200, {
        'Content-Type': 'text/javascript',
      });
      fs.createReadStream(filepath).pipe(res, {
        end: true,
      });
      return;
    } else if (req.url === '/results') {
      let body = '';
      req.setEncoding('utf8');
      for await (const chunk of req) {
        body += chunk;
      }

      const useragent = req.headers['user-agent'] as string;
      const cookies = cookie.parse(req.headers.cookie ?? '');
      const profile = await FingerprintProfile.save(
        useragent,
        JSON.parse(body) as IFingerprintProfile,
      );

      this.onProfile(profile, cookies['inconspicuous-cookie']);

      res.writeHead(200, {
        'Set-Cookie': `inconspicuous-cookie=${profile.stableHash}; Max-Age=30000`,
      });
      return res.end();
    } else if (req.url !== '/') {
      return res.writeHead(404).end();
    }

    fs.createReadStream(__dirname + '/../public/index.html').pipe(res, {
      end: true,
    });
  }
}
