export default abstract class BaseCheck {
  public path: string;
  public name: string;
  public identity: ICheckIdentity;

  abstract prefix: string;
  abstract type: ICheckType;

  protected constructor(identity: ICheckIdentity, path: string) {
    this.identity = identity;
    this.path = path;
    this.name = this.constructor.name;
  }

  abstract get id(): string;

  abstract get args(): any[];

  public get idPrefix(): string {
    return `${this.path}:${this.constructor.name}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public generateHumanScore(check: BaseCheck | null, profileCount?: number): number {
    this.ensureComparableCheck(check);
    return check ? 100 : 0;
  }

  protected ensureComparableCheck(check: BaseCheck | null) {
    if (check && this.id !== check.id) {
      throw new Error(`Check IDs do not match: ${this.id} !== ${check.id}`);
    }
  }
}

export enum CheckType {
  Individual = 'Individual',
  OverTime = 'OverTime',
}

export type ICheckType = keyof typeof CheckType;

export interface ICheckIdentity {
  isUniversal?: boolean;
  useragentId?: string;
  httpMethod?: string;
}
