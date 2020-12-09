import BaseCheck, { CheckType, ICheckIdentity } from '@double-agent/analyze/lib/checks/BaseCheck';

export default class SessionFingerprintCheck extends BaseCheck {
  public readonly prefix = 'SFNG';
  public readonly type = CheckType.Individual;

  private readonly fingerprints: string[];

  constructor(identity: ICheckIdentity, path: string, fingerprints: string[]) {
    super(identity, path);
    this.fingerprints = fingerprints;
  }

  public get id() {
    return `${this.path}:${this.constructor.name}`;
  }

  public get args() {
    return [this.fingerprints];
  }

  public generateHumanScore(check: SessionFingerprintCheck | null): number {
    super.generateHumanScore(check);
    const allMatch = check.fingerprints.every(x => x === check.fingerprints[0]);
    return allMatch ? 100 : 0;
  }
}
