import BaseCheck, { CheckType, ICheckIdentity } from '@double-agent/analyze/lib/checks/BaseCheck';

export default class FlagsCheck extends BaseCheck {
  public readonly prefix = 'FLAG';
  public readonly type = CheckType.Individual;

  private readonly flags: string[];

  constructor(identity: ICheckIdentity, path: string, flags: string[]) {
    super(identity, path);
    this.flags = (flags ?? []).sort();
  }

  public get id() {
    return `${this.idPrefix}:${this.flags.join('')}`;
  }

  public get args() {
    return [this.flags];
  }
}
