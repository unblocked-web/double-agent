import IRequestContext from './IRequestContext';
import IDetectionDomains from './IDetectionDomains';
import IDirective from './IDirective';
import IDetectionSession from './IDetectionSession';
import IdBucketTracker from '../lib/IdBucketTracker';

export default interface IDetectionPlugin {
  start?(domains: IDetectionDomains, secureDomains: IDetectionDomains, bucketTracker: IdBucketTracker): Promise<void>;
  stop?(): Promise<void>;
  onNewDirective?(directive: IDirective): Promise<void>;
  onRequest?(ctx: IRequestContext): Promise<void>;
  afterRequestDetectorsRun?(ctx: IRequestContext): Promise<void>;
  onWebsocketMessage?(message: any, session: IDetectionSession);
  handleResponse?(ctx: IRequestContext): Promise<boolean>;
  onPageLoaded?(page: string, ctx: IRequestContext);
}