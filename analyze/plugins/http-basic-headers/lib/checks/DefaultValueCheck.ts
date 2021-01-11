import BaseCheck, {
  CheckType,
  ICheckIdentity,
  ICheckMeta,
} from '@double-agent/analyze/lib/checks/BaseCheck';

export default class DefaultValueCheck extends BaseCheck {
  public readonly prefix = 'DVAL';
  public readonly type = CheckType.Individual;

  private readonly value: string[];

  constructor(identity: ICheckIdentity, meta: ICheckMeta, value: string[]) {
    super(identity, meta);
    this.value = value;
  }

  public get id() {
    return `${this.idPrefix}:${this.value.join('&')}`;
  }

  public get args() {
    return [this.value];
  }
}
