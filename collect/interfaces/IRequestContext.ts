import { URL } from 'url';
import { IncomingMessage, ServerResponse } from 'http';
import IRequestDetails from './IRequestDetails';
import Session from '../lib/Session';
import {DomainType} from "../lib/DomainUtils";
import BaseServer from "../servers/BaseServer";
import {IPluginPage} from "../lib/Plugin";

export default interface IRequestContext {
  server: BaseServer,
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  requestDetails: IRequestDetails;
  session: Session;
  page: IPluginPage;
  nextPageLink: string;
  buildUrl: (path: string, domainType?: keyof typeof DomainType, protocol?: string) => string;
}
