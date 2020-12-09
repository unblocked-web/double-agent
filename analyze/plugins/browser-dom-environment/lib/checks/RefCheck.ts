import BaseCheck, { CheckType, ICheckIdentity } from '@double-agent/analyze/lib/checks/BaseCheck';

export default class RefCheck extends BaseCheck {
  public readonly prefix = 'REFR';
  public readonly type = CheckType.Individual;

  private readonly value: string;

  constructor(identity: ICheckIdentity, path: string, value: string) {
    super(identity, path);
    this.value = value;
  }

  public get id() {
    return `${this.idPrefix}:${this.value}`;
  }

  public get args() {
    return [this.value];
  }
}
