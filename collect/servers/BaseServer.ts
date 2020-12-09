import Plugin, { IRoutesByPath } from '../lib/Plugin';
import IServerContext from '../interfaces/IServerContext';

export type IServerProtocol = 'tls' | 'http' | 'https';

export default class BaseServer {
  public port: number;
  public protocol: IServerProtocol;

  private readonly routesByPath: IRoutesByPath = {};
  private context: IServerContext;

  constructor(protocol: IServerProtocol, port: number, routesByPath: IRoutesByPath) {
    this.protocol = protocol;
    this.port = port;
    this.routesByPath = routesByPath;
  }

  public get plugin(): Plugin {
    return this.context.plugin;
  }

  public async start(context: IServerContext) {
    this.context = context;
    return this;
  }

  public cleanPath(rawPath: string) {
    return rawPath.replace(new RegExp(`^/${this.plugin.id}`), '');
  }

  public getHandlerFn(rawPath: string) {
    const cleanedPath = this.cleanPath(rawPath);
    return this.routesByPath[cleanedPath]?.handlerFn;
  }

  public getRoute(rawPath: string) {
    const cleanedPath = this.cleanPath(rawPath);
    return this.routesByPath[cleanedPath];
  }
}
