import BaseCheck, {
  CheckType,
  ICheckIdentity,
  ICheckMeta,
} from '@double-agent/analyze/lib/checks/BaseCheck';

export default class PrototypeCheck extends BaseCheck {
  public readonly prefix = 'PRTO';
  public readonly type = CheckType.Individual;

  private readonly prototypes: string[];

  constructor(identity: ICheckIdentity, meta: ICheckMeta, prototypes: string[]) {
    super(identity, meta);
    this.prototypes = (prototypes ?? []).sort();
  }

  public get id() {
    return `${this.idPrefix}:${this.prototypes.join(',')}`;
  }

  public get args() {
    return [this.prototypes];
  }
}
