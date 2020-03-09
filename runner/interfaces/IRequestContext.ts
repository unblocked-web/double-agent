import { IncomingMessage, ServerResponse } from 'http';
import IRequestDetails from './IRequestDetails';
import IDetectionSession from './IDetectionSession';
import IDomainset from './IDomainset';

export default interface IRequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  requestDetails: IRequestDetails;
  session: IDetectionSession;
  domains: IDomainset;
  extraHead: string[];
  extraScripts: string[];
}
