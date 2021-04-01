import Fs from 'fs';
import TlsServerBase from '@double-agent/tls-server';
import IServerContext from '../interfaces/IServerContext';
import createTlsRequestHandler from '../lib/createTlsRequestHandler';
import BaseServer from './BaseServer';
import { IRoutesByPath } from '../lib/Plugin';
import { TlsDomain } from '../index';
import createWebsocketHandler from '../lib/createWebsocketHandler';

const certPath = process.env.LETSENCRYPT
  ? `/etc/letsencrypt/live/${TlsDomain}`
  : `${__dirname}/../certs`;

export default class TlsServer extends BaseServer {
  private internalServer: TlsServerBase;

  constructor(port: number, routesByPath: IRoutesByPath) {
    super('tls', port, routesByPath);
  }

  public async start(context: IServerContext) {
    await super.start(context);
    const tlsRequestHandler = createTlsRequestHandler(this, context);
    const websocketHandler = createWebsocketHandler(this, context);
    const options = {
      key: Fs.readFileSync(`${certPath}/privkey.pem`),
      cert: Fs.readFileSync(`${certPath}/fullchain.pem`),
    };

    this.internalServer = await new Promise<TlsServerBase>(resolve => {
      const server = new TlsServerBase(options, tlsRequestHandler);
      server.on('upgrade', websocketHandler);
      server.listen(this.port, () => resolve(server));
    });
    this.internalServer.on('error', error => {
      console.log('TlsServer ERROR: ', error);
    });
    return this;
  }

  public async stop(): Promise<any> {
    this.internalServer.close();
    console.log(`TLS Server closed (port: ${this.port})`);
  }
}
