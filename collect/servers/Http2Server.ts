import http2 from 'http2';
import * as Fs from 'fs';
import createHttpRequestHandler from '../lib/createHttpRequestHandler';
import createWebsocketHandler from '../lib/createWebsocketHandler';
import IServerContext from '../interfaces/IServerContext';
import BaseServer from './BaseServer';
import { IRoutesByPath } from '../lib/Plugin';
import { MainDomain } from '../index';

const certPath = process.env.LETSENCRYPT
  ? `/etc/letsencrypt/live/${MainDomain}`
  : `${__dirname}/../certs`;

export default class Http2Server extends BaseServer {
  private http2Server: http2.Http2SecureServer;

  constructor(port: number, routesByPath: IRoutesByPath) {
    super('http2', port, routesByPath);
  }

  public async start(context: IServerContext) {
    await super.start(context);
    const httpRequestHandler = createHttpRequestHandler(this, context);
    const websocketHandler = createWebsocketHandler(this, context);
    const options = <http2.SecureServerOptions>{
      key: Fs.readFileSync(`${certPath}/privkey.pem`),
      cert: Fs.readFileSync(`${certPath}/fullchain.pem`),
    };

    this.http2Server = await new Promise<http2.Http2SecureServer>(resolve => {
      const server = http2.createSecureServer(options, httpRequestHandler);
      server.on('upgrade', websocketHandler);
      server.listen(this.port, () => resolve(server));
    });

    return this;
  }

  public async stop(): Promise<any> {
    this.http2Server.close();
    console.log(`HTTPS Server closed (port: ${this.port}`);
  }
}
