import Useragent, { Agent } from 'useragent';

export function getUseragentPath(useragent: string) {
  if (!useragent) return 'none';
  const userAgent = Useragent.lookup(useragent);
  return getAgentPath(userAgent);
}

export function getAgentBrowser(userAgent: Agent) {
  return `${userAgent.family.toLowerCase()}_${userAgent.major}`;
}

export function getAgentOs(userAgent: Agent) {
  return userAgent.os.family.replace(/\s/g, '_').toLowerCase();
}

export function getAgentPath(userAgent: Agent) {
  const os = getAgentOs(userAgent);
  const osv = userAgent.os.major + '_' + userAgent.os.minor;

  return `${os}_${osv}__${userAgent.family.toLowerCase()}_${userAgent.major}`;
}
