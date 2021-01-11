export default abstract class BaseCheck {
  public name: string;
  public identity: ICheckIdentity;
  public meta: ICheckMeta;

  abstract prefix: string;
  abstract type: ICheckType;

  protected constructor(identity: ICheckIdentity, meta: ICheckMeta) {
    this.name = this.constructor.name;
    this.identity = identity;
    this.meta = meta;
  }

  abstract get id(): string;

  abstract get args(): any[];

  public get idPrefix(): string {
    const  { protocol, httpMethod, path } = this.meta;
    return [protocol, httpMethod, path, this.constructor.name].filter(x => x).join(':');
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
  userAgentId?: string;
}

export interface ICheckMeta {
  path: string;
  protocol?: string;
  httpMethod?: string;
}
