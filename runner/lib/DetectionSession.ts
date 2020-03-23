import IDetectionSession from '../interfaces/IDetectionSession';
import IAsset from '../interfaces/IAsset';
import IFlaggedCheck from '../interfaces/IFlaggedCheck';
import { Agent, lookup } from 'useragent';
import IRequestDetails from '../interfaces/IRequestDetails';
import OriginType from '../interfaces/OriginType';
import IUserIdentifier from '../interfaces/IUserIdentifier';
import IDomainset from '../interfaces/IDomainset';
import ICheckCounter from '../interfaces/ICheckCounter';
import { assetFromURL } from './flagUtils';

export default class DetectionSession implements IDetectionSession {
  public readonly assetsNotLoaded: IAsset[] = [];
  public readonly checks: ICheckCounter[] = [];
  public readonly expectedAssets: (IAsset & { fromUrl?: string })[] = [];
  public expectedUseragent: string;

  public readonly flaggedChecks: IFlaggedCheck[] = [];
  public readonly identifiers: IUserIdentifier[] = [];
  public parsedUseragent: Agent;
  public readonly pluginsRun: string[] = [];
  public readonly requests: IRequestDetails[] = [];
  public userUuid: string;
  public useragent: string;

  constructor(readonly id: string) {}

  public setUseragent(useragent: string) {
    this.useragent = useragent;
    this.parsedUseragent = lookup(useragent);
  }

  public trackAsset(url: URL, origin: OriginType, domains: IDomainset, fromUrl?: string) {
    url.searchParams.set('sessionid', this.id);
    const asset: any = assetFromURL(url, origin, domains);
    asset.fromUrl = fromUrl;
    this.expectedAssets.push(asset);
    return url;
  }

  public recordCheck(flagCheck: boolean, flaggedCheck: IFlaggedCheck) {
    if (flagCheck) {
      this.flaggedChecks.push(flaggedCheck);
    }
    this.recordCheckRun(flaggedCheck);
    return flaggedCheck;
  }

  private recordCheckRun(check: Pick<IFlaggedCheck, 'category' | 'layer' | 'checkName'>) {
    const { checkName, category, layer } = check;
    let entry = this.checks.find(x => x.checkName === checkName && x.category === category);
    if (!entry) {
      entry = { checkName, category, layer, count: 0 };
      this.checks.push(entry);
    }
    entry.count += 1;
  }
}
