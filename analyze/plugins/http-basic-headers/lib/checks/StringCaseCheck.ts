import StringCheck from '@double-agent/analyze/lib/checks/StringCheck';
import { CheckType } from '@double-agent/analyze/lib/checks/BaseCheck';

export default class StringCaseCheck extends StringCheck {
  public readonly prefix = 'STRC';
  public readonly type = CheckType.Individual;

  public get id() {
    return `${this.idPrefix}:${this.value}`;
  }

  public get args() {
    return [this.value];
  }
}
