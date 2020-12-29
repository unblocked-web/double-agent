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

export interface IHttp2SessionActivity {
  type: string;
  data: any;
}

export default class Http2Server extends BaseServer {
  public sessions: { session: http2.ServerHttp2Session; activity: IHttp2SessionActivity[] }[] = [];

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
      server.on('checkContinue', (request, response) => {
        const session = this.sessions.find(x => x.session === request.stream.session);
        session.activity.push({
          type: 'checkContinue',
          data: {
            headers: request.headers,
          },
        });
        response.writeContinue();
      });
      server.on('session', session => {
        const sessionActivity = {
          session,
          activity: [],
        };
        const activity = sessionActivity.activity;

        this.sessions.push(sessionActivity);
        session.on('ping', bytes => {
          activity.push({
            type: 'ping',
            data: bytes.toString('utf8'),
          });
        });
        session.on('close', () => {
          activity.push({
            type: 'close',
          });
        });
        session.on('frameError', (frameType: number, errorCode: number, streamID: number) => {
          activity.push({
            type: 'frameError',
            data: {
              frameType,
              errorCode,
              streamID,
            },
          });
        });
        session.on('remoteSettings', settings => {
          activity.push({
            type: 'remoteSettings',
            data: settings,
          });
        });
        session.on('localSettings', settings => {
          activity.push({
            type: 'localSettings',
            data: settings,
          });
        });
        session.on('goaway', (errorCode: number, lastStreamID: number, opaqueData: Buffer) => {
          activity.push({
            type: 'goaway',
            data: {
              errorCode,
              lastStreamID,
              opaqueData,
            },
          });
        });
        session.on('stream', (stream, headers, flags) => {
          activity.push({
            type: 'stream',
            data: {
              id: stream.id,
              authority: headers[':authority'],
              method: headers[':method'],
              scheme: headers[':scheme'],
              path: headers[':path'],
              flags,
              hpackOutboundSize: session.state.deflateDynamicTableSize,
              hpackInboundSize: session.state.inflateDynamicTableSize,
            },
          });
          stream.on('streamClosed', code => {
            activity.push({
              type: 'streamClosed',
              data: { code },
            });
          });
          stream.on('trailers', (trailers, trailerFlags) => {
            activity.push({
              type: 'trailers',
              data: {
                trailers,
                flags: trailerFlags,
              },
            });
          });
        });
      });
      server.listen(this.port, () => resolve(server));
    });

    return this;
  }

  public async stop(): Promise<any> {
    this.sessions.forEach(x => x.session.close());
    this.http2Server.close();
    console.log(`HTTPS Server closed (port: ${this.port}`);
  }
}
