import IRequestDetails from './IRequestDetails';
import { Agent } from 'useragent';
import IFlaggedCheck from './IFlaggedCheck';
import IUserIdentifiers from './IUserIdentifiers';
import IAsset from './IAsset';

export default interface IDetectionSession {
  requests: IRequestDetails[];
  flaggedChecks: IFlaggedCheck[];
  identifiers: IUserIdentifiers[];
  assetsNotLoaded: IAsset[];
  pluginsRun: string[];
  useragent: string;
  expectedUseragent: string;
  parsedUseragent: Agent;
  id: string;
}


