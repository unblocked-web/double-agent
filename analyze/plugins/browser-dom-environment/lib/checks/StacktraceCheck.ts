import BaseCheck, { CheckType, ICheckIdentity } from '@double-agent/analyze/lib/checks/BaseCheck';

export default class StacktraceCheck extends BaseCheck {
  public readonly prefix = 'STCK';
  public readonly type = CheckType.Individual;

  private readonly errorClass: string;

  constructor(identity: ICheckIdentity, path: string, stacktrace: string) {
    super(identity, path);
    this.errorClass = stacktrace.split('\n').shift();
  }

  public get id() {
    return `${this.idPrefix}:errorClass=${this.errorClass}`;
  }

  public get args() {
    return [this.errorClass];
  }
}
