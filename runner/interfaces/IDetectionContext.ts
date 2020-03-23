import DetectorPluginDelegate from '../server/DetectorPluginDelegate';
import IDetectorModule from './IDetectorModule';
import SessionTracker from '../lib/SessionTracker';
import UserBucketTracker from '../lib/UserBucketTracker';

export default interface IDetectionContext {
  readonly pluginDelegate: DetectorPluginDelegate;
  readonly detectors: IDetectorModule[];
  readonly sessionTracker: SessionTracker;
  readonly bucketTracker: UserBucketTracker;
  readonly getNow: () => Date;
}
