import BaseCheck, { CheckType, ICheckIdentity } from '@double-agent/analyze/lib/checks/BaseCheck';

export default class ExpectedValueCheck extends BaseCheck {
  public readonly prefix = 'EVLS';
  public readonly type = CheckType.Individual;

  private readonly expectedValues: (string | number)[];
  private readonly value: string | number;

  constructor(
    identity: ICheckIdentity,
    path: string,
    expectedValues: (string | number)[],
    value: string | number,
  ) {
    super(identity, path);
    this.expectedValues = expectedValues;
    this.value = value;
  }

  public get id() {
    return `${this.idPrefix}:${this.expectedValues.join(',')}`;
  }

  public get args() {
    return [this.expectedValues, this.value];
  }

  public generateHumanScore(check: ExpectedValueCheck | null): number {
    super.generateHumanScore(check);
    return 100;
  }
}
