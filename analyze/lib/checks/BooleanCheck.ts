import BaseCheck, { ICheckIdentity, CheckType } from './BaseCheck';

export default class BooleanCheck extends BaseCheck {
  public readonly prefix = 'BOOL';
  public readonly type = CheckType.Individual;

  private readonly value: boolean;

  constructor(identity: ICheckIdentity, path: string, value: boolean) {
    super(identity, path);
    this.value = value;
  }

  public get id() {
    return `${this.idPrefix}:value=${this.value}`;
  }

  public get args() {
    return [this.value];
  }
}
