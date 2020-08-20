import BaseCheck, { CheckType, ICheckIdentity } from '@double-agent/analyze/lib/checks/BaseCheck';

export default class PrototypeCheck extends BaseCheck {
  public readonly prefix = 'PRTO';
  public readonly type = CheckType.Individual;

  private readonly prototypes: string[];

  constructor(identity: ICheckIdentity, path: string, prototypes: string[]) {
    super(identity, path);
    this.prototypes = (prototypes ?? []).sort();
  }

  public get id() {
    return `${this.idPrefix}:${this.prototypes.join(',')}`;
  }

  public get args() {
    return [this.prototypes];
  }
}
