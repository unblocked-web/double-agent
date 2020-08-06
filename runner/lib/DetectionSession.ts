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
import { URL } from 'url';
import { IBrowserToTestPickType, IBrowserToTestUsagePercent } from '@double-agent/profiler/lib/BrowsersToTest';
import IAssignment from '../interfaces/IAssignment';

export default class DetectionSession implements IDetectionSession {
  public readonly id: string;
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

  private readonly pickType: IBrowserToTestPickType = [];
  private readonly usagePercent: IBrowserToTestUsagePercent;

  constructor(id: string, assignment?: IAssignment) {
    this.id = id;
    if (assignment) {
      this.pickType = assignment.pickType;
      this.usagePercent = assignment.usagePercent;
    }
  }

  public get pctBot() {
    let pctBot = 0;
    for (const flaggedCheck of this.flaggedChecks) {
      pctBot = Math.max(flaggedCheck.pctBot, pctBot);
    }
    return pctBot
  }

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

  public recordCheck(
    flagCheck: boolean,
    flaggedCheck: IFlaggedCheck,
    skipPreviousRecordingCheck = false,
  ) {
    if (flagCheck) {
      this.flaggedChecks.push(flaggedCheck);
    }
    this.recordCheckRun(flaggedCheck, skipPreviousRecordingCheck);
    return flaggedCheck;
  }

  public toJSON() {
    return {
      id: this.id,
      pctBot: this.pctBot,
      pickType: this.pickType,
      usagePercent: this.usagePercent,
      assetsNotLoaded: this.assetsNotLoaded,
      checks: this.checks,
      expectedAssets: this.expectedAssets,
      expectedUseragent: this.expectedUseragent,
      flaggedChecks: this.flaggedChecks,
      identifiers: this.identifiers,
      parsedUseragent: this.parsedUseragent,
      pluginsRun: this.pluginsRun,
      requests: this.requests,
      userUuid: this.userUuid,
      useragent: this.useragent,
    }
  }

  private recordCheckRun(
    check: Pick<IFlaggedCheck, 'category' | 'layer' | 'checkName'>,
    skipPreviousRecordingCheck = false,
  ) {
    const { checkName, category, layer } = check;
    let entry = skipPreviousRecordingCheck
      ? null
      : this.checks.find(x => x.checkName === checkName && x.category === category);
    if (!entry) {
      entry = { checkName, category, layer, count: 0 };
      this.checks.push(entry);
    }
    entry.count += 1;
  }
}
