import BaseCheck, { CheckType, ICheckIdentity } from './BaseCheck';

export default class PathCheck extends BaseCheck {
  public readonly prefix = 'PATH';
  public readonly type = CheckType.Individual;

  public constructor(identity: ICheckIdentity, path: string) {
    super(identity, path);
  }

  public get id() {
    return `${this.path}:${this.constructor.name}`;
  }

  public get args() {
    return [];
  }
}
