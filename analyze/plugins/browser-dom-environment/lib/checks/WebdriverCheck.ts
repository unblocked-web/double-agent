import BaseCheck, { CheckType, ICheckIdentity } from '@double-agent/analyze/lib/checks/BaseCheck';

export default class WebdriverCheck extends BaseCheck {
  public readonly prefix = 'WBDR';
  public readonly type = CheckType.Individual;

  public constructor(identity: ICheckIdentity, path: string) {
    super(identity, path);
  }

  public get id() {
    return `${this.path}:${this.constructor.name}`;
  }

  public get args() {
    return [];
  }

  public generateHumanScore(check: WebdriverCheck | null): number {
    super.generateHumanScore(check);
    return check ? 0 : 100;
  }
}
