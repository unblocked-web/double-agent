import { IncomingMessage, ServerResponse } from 'http';
import IRequestDetails from './IRequestDetails';
import IDetectionSession from './IDetectionSession';
import IDomainset from './IDomainset';
import HostDomain from './HostDomain';
import IdBucketTracker from '../lib/IdBucketTracker';

export default interface IRequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  requestDetails: IRequestDetails;
  session: IDetectionSession;
  bucketTracker: IdBucketTracker,
  domains: IDomainset;
  extraHead: string[];
  extraScripts: string[];
  trackUrl: (path: string, domain?: HostDomain, protocol?: string) => string;
}
