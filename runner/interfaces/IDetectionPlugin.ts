import IRequestContext from './IRequestContext';
import IDetectionDomains from './IDetectionDomains';
import IDirective from './IDirective';
import IDetectionSession from './IDetectionSession';
import UserBucketTracker from '../lib/UserBucketTracker';

export default interface IDetectionPlugin {
  start?(domains: IDetectionDomains, secureDomains: IDetectionDomains, bucketTracker: UserBucketTracker): Promise<void>;
  stop?(): Promise<void>;
  onNewDirective?(directive: IDirective): Promise<void>;
  onRequest?(ctx: IRequestContext): Promise<void>;
  afterRequestDetectorsRun?(ctx: IRequestContext): Promise<void>;
  onWebsocketMessage?(message: any, session: IDetectionSession);
  handleResponse?(ctx: IRequestContext): Promise<boolean>;
  onPageLoaded?(page: string, ctx: IRequestContext);
}
