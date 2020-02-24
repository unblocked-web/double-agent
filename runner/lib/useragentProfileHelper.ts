import Useragent, { Agent, lookup } from 'useragent';
import fs from 'fs';

export function getUseragentPath(useragent: string) {
  const userAgent = Useragent.lookup(useragent);
  return getAgentPath(userAgent);
}

export function getAgentPath(userAgent: Agent) {
  const os = userAgent.os.family.replace(/\s/g, '_').toLowerCase();
  const osv = userAgent.os.major + '_' + userAgent.os.minor;

  return `${os}_${osv}__${userAgent.family.toLowerCase()}_${userAgent.major}`;
}

export function saveUseragentProfile(useragent: string, data: any, profilesDir: string) {
  // http requests from webdriver sometimes have ruby profiles
  if (useragent.startsWith('Ruby')) return;
  const browserPath = getUseragentPath(useragent);
  try {
    let counter = 0;
    let agentName = `${profilesDir}/${browserPath}`;
    while (fs.existsSync(`${agentName}--${counter}.json`)) {
      counter += 1;
    }

    fs.writeFileSync(`${agentName}--${counter}.json`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log(err);
  }
}

export function getNewestBrowser(agents: string[]) {
  // pick max version
  return agents
    .map(x => ({
      agent: lookup(x),
      str: x,
    }))
    .sort((a, b) => b.agent.major.localeCompare(a.agent.major))
    .shift().str;
}

export function matchUserAgent(item: { userAgent: Agent }, thisAgent: Agent) {
  if (item.userAgent.major !== thisAgent.major) return false;
  if (item.userAgent.family !== thisAgent.family) return false;
  if (item.userAgent.os.family !== thisAgent.os.family) return false;
  if (
    [item.userAgent.os.major, item.userAgent.os.minor].toString() !==
    [thisAgent.os.major, thisAgent.os.minor].toString()
  ) {
    return false;
  }
  return true;
}
