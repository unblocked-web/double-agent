import BaseCheck, { CheckType, ICheckIdentity } from './BaseCheck';

export default class DecimalLengthCheck extends BaseCheck {
  public readonly prefix = 'DECL';
  public readonly type = CheckType.Individual;

  private readonly length: number;

  constructor(identity: ICheckIdentity, path: string, length: number) {
    super(identity, path);
    this.length = length;
  }

  public get id() {
    return `${this.idPrefix}:${this.length}`;
  }

  public get args() {
    return [this.length];
  }
}
