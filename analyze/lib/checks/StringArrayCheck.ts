import BaseCheck, { CheckType, ICheckIdentity, ICheckMeta } from './BaseCheck';

export default class StringArrayCheck extends BaseCheck {
  public readonly prefix: string = 'STRA';
  public readonly type = CheckType.Individual;

  protected readonly value: string;

  constructor(identity: ICheckIdentity, meta: ICheckMeta, value: string) {
    super(identity, meta);
    this.value = value;
  }

  public get id() {
    return `${this.idPrefix}:${this.value}`;
  }

  public get args() {
    return [this.value];
  }
}
