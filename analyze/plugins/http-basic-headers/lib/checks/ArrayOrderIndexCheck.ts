import BaseCheck, {
  CheckType,
  ICheckIdentity,
  ICheckMeta,
} from '@double-agent/analyze/lib/checks/BaseCheck';

type IOrderIndex = [string[], string[]];

export default class ArrayOrderIndexCheck extends BaseCheck {
  public readonly prefix = 'AORD';
  public readonly type = CheckType.Individual;

  private readonly orderIndex: IOrderIndex;

  constructor(identity: ICheckIdentity, meta: ICheckMeta, orderIndex: IOrderIndex) {
    super(identity, meta);
    this.orderIndex = orderIndex;
  }

  public get id() {
    const index = this.orderIndex.map(i => i.join(',')).join(';');
    return `${this.idPrefix}:${index}`;
  }

  public get args() {
    return [this.orderIndex];
  }

  // public generateHumanScore(check: BaseCheck | null, profileCount?: number): number {
  //   this.ensureComparableCheck(check);
  //   return check ? 100 : 0;
  // }
}
