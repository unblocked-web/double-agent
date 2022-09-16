import TlsServerBase from '@double-agent/tls-server';
import IServerContext from '../interfaces/IServerContext';
import createTlsRequestHandler from '../lib/createTlsRequestHandler';
import BaseServer from './BaseServer';
import { IRoutesByPath } from '../lib/Plugin';
import { tlsCerts } from './Certs';

export default class TlsServer extends BaseServer {
  private internalServer: TlsServerBase;

  constructor(port: number, routesByPath: IRoutesByPath) {
    super('tls', port, routesByPath);
  }

  public override async start(context: IServerContext): Promise<this> {
    await super.start(context);
    const tlsRequestHandler = createTlsRequestHandler(this, context);

    this.internalServer = await new Promise<TlsServerBase>((resolve) => {
      const server = new TlsServerBase(tlsCerts, tlsRequestHandler);
      server.listen(this.port, () => resolve(server));
    });
    this.internalServer.on('error', (error) => {
      console.log('TlsServer ERROR: ', error);
    });
    return this;
  }

  public async stop(): Promise<any> {
    this.internalServer.close();
    console.log(`TLS Server closed (port: ${this.port})`);
  }
}
