import https from 'https';
import * as Fs from 'fs';
import createHttpRequestHandler from '../lib/createHttpRequestHandler';
import createWebsocketHandler from '../lib/createWebsocketHandler';
import IServerContext from '../interfaces/IServerContext';
import BaseServer from './BaseServer';
import { IRoutesByPath } from '../lib/Plugin';
import { MainDomain } from '../index';

const certPath = process.env.LETSENCRYPT
  ? `/etc/letsencrypt/live/${MainDomain}`
  : `${__dirname  }/../certs`;

export default class HttpServer extends BaseServer {
  private httpsServer: https.Server;

  constructor(port: number, routesByPath: IRoutesByPath) {
    super('https', port, routesByPath);
  }

  public async start(context: IServerContext) {
    await super.start(context);
    const httpRequestHandler = createHttpRequestHandler(this, context);
    const websocketHandler = createWebsocketHandler(this, context);
    const options = {
      key: Fs.readFileSync(`${certPath  }/privkey.pem`),
      cert: Fs.readFileSync(`${certPath  }/fullchain.pem`),
    };

    this.httpsServer = await new Promise<https.Server>(resolve => {
      const server = https.createServer(options, httpRequestHandler);
      server.on('upgrade', websocketHandler);
      server.listen(this.port, () => resolve(server));
    });

    return this;
  }

  public async stop(): Promise<any> {
    this.httpsServer.close();
    console.log(`HTTPS Server closed (port: ${this.port}`);
  }
}
