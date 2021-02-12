import BaseCheck, {CheckType, ICheckIdentity, ICheckMeta} from '@double-agent/analyze/lib/checks/BaseCheck';

export default class WebdriverCheck extends BaseCheck {
  public readonly prefix = 'WBDR';
  public readonly type = CheckType.Individual;

  public constructor(identity: ICheckIdentity, meta: ICheckMeta) {
    super(identity, meta);
  }

  public get id() {
    return `${this.meta}:${this.constructor.name}`;
  }

  public get args() {
    return [];
  }

  public generateHumanScore(check: WebdriverCheck | null): number {
    super.generateHumanScore(check);
    return check ? 0 : 100;
  }
}
