import BaseCheck, { CheckType, ICheckIdentity } from './BaseCheck';

export default class NumberCheck extends BaseCheck {
  public readonly prefix = 'NUMR';
  public readonly type = CheckType.Individual;

  private readonly value: number;
  private readonly label: string;

  constructor(identity: ICheckIdentity, path: string, value: number, label?: string) {
    super(identity, path);
    this.value = value;
    this.label = label;
  }

  public get id() {
    return `${this.idPrefix}:${this.value}`;
  }

  public get args() {
    return [this.value, this.label];
  }
}
