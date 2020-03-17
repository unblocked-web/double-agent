import IRequestDetails from './IRequestDetails';
import { Agent } from 'useragent';
import IFlaggedCheck from './IFlaggedCheck';
import IUserIdentifiers from './IUserIdentifier';
import IAsset from './IAsset';
import OriginType from './OriginType';
import IDomainset from './IDomainset';

export default interface IDetectionSession {
  requests: IRequestDetails[];
  flaggedChecks: IFlaggedCheck[];
  identifiers: IUserIdentifiers[];
  assetsNotLoaded: IAsset[];
  expectedAssets: (IAsset & { fromUrl?: string })[];
  pluginsRun: string[];
  useragent: string;
  expectedUseragent: string;
  parsedUseragent: Agent;
  userUuid: string;
  id: string;
  trackAsset: (url: URL, origin: OriginType, domains: IDomainset, fromUrl?: string) => void;
}
