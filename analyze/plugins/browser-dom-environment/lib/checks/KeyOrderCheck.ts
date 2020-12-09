import BaseCheck, { CheckType, ICheckIdentity } from '@double-agent/analyze/lib/checks/BaseCheck';

export default class KeyOrderCheck extends BaseCheck {
  public readonly prefix = 'KORD';
  public readonly type = CheckType.Individual;

  private readonly keys: string[];

  constructor(identity: ICheckIdentity, path: string, keys: string[]) {
    super(identity, path);
    this.keys = keys;
  }

  public get id() {
    return `${this.idPrefix}:${this.keys.join(',')}`;
  }

  public get args() {
    return [this.keys];
  }
}
