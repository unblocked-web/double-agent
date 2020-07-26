import IRequestContext from './IRequestContext';
import IDetectionDomains from './IDetectionDomains';
import IAssignment from './IAssignment';
import IDetectionSession from './IDetectionSession';
import UserBucketTracker from '../lib/UserBucketTracker';

export default interface IDetectionPlugin {
  start?(domains: IDetectionDomains, secureDomains: IDetectionDomains, bucketTracker: UserBucketTracker): Promise<void>;
  stop?(): Promise<void>;
  onNewAssignment?(assignment: IAssignment): Promise<void>;
  onRequest?(ctx: IRequestContext): Promise<void>;
  afterRequestDetectorsRun?(ctx: IRequestContext): Promise<void>;
  onWebsocketMessage?(message: any, session: IDetectionSession);
  handleResponse?(ctx: IRequestContext): Promise<boolean>;
  onPageLoaded?(page: string, ctx: IRequestContext);
}
