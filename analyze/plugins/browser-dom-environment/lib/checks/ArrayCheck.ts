import BaseCheck, { CheckType, ICheckIdentity } from '@double-agent/analyze/lib/checks/BaseCheck';

export default class ArrayCheck extends BaseCheck {
  public readonly prefix = 'ARRY';
  public readonly type = CheckType.Individual;

  private readonly hasLengthProperty: boolean;

  constructor(identity: ICheckIdentity, path: string, hasLengthProperty: boolean) {
    super(identity, path);
    this.hasLengthProperty = hasLengthProperty;
  }

  public get id() {
    return `${this.idPrefix}:hasLengthProperty=${this.hasLengthProperty}`;
  }

  public get args() {
    return [this.hasLengthProperty];
  }
}
