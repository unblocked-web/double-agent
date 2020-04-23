import { IncomingMessage, ServerResponse } from 'http';
import IRequestDetails from './IRequestDetails';
import IDomainset from './IDomainset';
import HostDomain from './HostDomain';
import UserBucketTracker from '../lib/UserBucketTracker';
import DetectionSession from '../lib/DetectionSession';
import { URL } from 'url';

export default interface IRequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  requestDetails: IRequestDetails;
  session: DetectionSession;
  bucketTracker: UserBucketTracker;
  domains: IDomainset;
  extraHead: string[];
  extraScripts: string[];
  trackUrl: (path: string, domain?: HostDomain, protocol?: string) => string;
}
