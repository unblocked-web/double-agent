import Useragent from 'useragent';
import IDirective from './IDirective';

export function agentToDirective(
  useragent: string,
): Pick<IDirective, 'browser' | 'browserMajorVersion' | 'os' | 'osVersion' | 'useragent'> {
  const ua = Useragent.lookup(useragent);
  return {
    browser: ua.family,
    browserMajorVersion: ua.major,
    os: ua.os.family,
    osVersion: [ua.os.major, ua.os.minor].join('.'),
    useragent,
  };
}

export function isDirectiveMatch(directive: IDirective, useragent: string) {
  if (useragent === directive.useragent) return true;

  const ua = Useragent.lookup(useragent);
  if (ua.os.family !== directive.os) return false;
  if (directive.osVersion && [ua.os.major, ua.os.minor].join('.') !== directive.osVersion)
    return false;

  if (directive.browserMajorVersion && ua.major !== directive.browserMajorVersion) return false;
  if (ua.family !== directive.browser) return false;

  return true;
}
