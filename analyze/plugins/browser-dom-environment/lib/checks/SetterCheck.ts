import BaseCheck, {
  CheckType,
  ICheckIdentity,
  ICheckMeta,
} from '@double-agent/analyze/lib/checks/BaseCheck';

type IData = { codeString: string } | { codeStringToString: string };

export default class SetterCheck extends BaseCheck {
  public readonly prefix = 'SETR';
  public readonly type = CheckType.Individual;

  private readonly data: IData;

  constructor(identity: ICheckIdentity, meta: ICheckMeta, data: IData) {
    super(identity, meta);
    this.data = data;
  }

  public get id() {
    for (const key of Object.keys(this.data)) {
      return `${this.idPrefix}:${key}=${this.data[key]}`;
    }
  }

  public get args() {
    return [this.data];
  }
}
