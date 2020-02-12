import Useragent from 'useragent';
import fs from 'fs';

export function getUseragentPath(useragent: string) {
  const userAgent = Useragent.lookup(useragent);
  const os = userAgent.os.family.replace(/\s/g, '_').toLowerCase();
  const osv = userAgent.os.major + '_' + userAgent.os.minor;

  return `${os}_${osv}__${userAgent.family.toLowerCase()}_${userAgent.major}`;
}

export function saveUseragentProfile(useragent: string, data: any, profilesDir: string) {
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
