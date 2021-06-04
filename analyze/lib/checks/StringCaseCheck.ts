import StringCheck from './StringCheck';
import { CheckType } from './BaseCheck';

export default class StringCaseCheck extends StringCheck {
  public readonly prefix = 'STRC';
  public readonly type = CheckType.Individual;

  public get signature() {
    return `${this.id}:${this.value}`;
  }

  public get args() {
    return [this.value];
  }
}
