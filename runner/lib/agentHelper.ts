import IDirective from './IDirective';
import { getUseragentPath } from './useragentProfileHelper';

export function agentToDirective(
  useragent: string,
): Pick<IDirective, 'isOsTest' | 'browserGrouping' | 'useragent'> {
  return {
    isOsTest: false,
    browserGrouping: getUseragentPath(useragent),
    useragent,
  };
}

export function isDirectiveMatch(directive: IDirective, useragent: string) {
  if (useragent === directive.useragent) return true;

  const grouping = getUseragentPath(useragent);
  return grouping === directive.browserGrouping;
}
