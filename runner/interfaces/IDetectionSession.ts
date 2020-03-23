import IRequestDetails from './IRequestDetails';
import IFlaggedCheck from './IFlaggedCheck';
import IUserIdentifiers from './IUserIdentifier';
import IAsset from './IAsset';
import ICheckCounter from './ICheckCounter';

export default interface IDetectionSession {
  requests: IRequestDetails[];
  checks: ICheckCounter[];
  flaggedChecks: IFlaggedCheck[];
  identifiers: IUserIdentifiers[];
  assetsNotLoaded: IAsset[];
  expectedAssets: (IAsset & { fromUrl?: string })[];
  pluginsRun: string[];
  useragent: string;
  expectedUseragent: string;
  userUuid: string;
  id: string;
}
