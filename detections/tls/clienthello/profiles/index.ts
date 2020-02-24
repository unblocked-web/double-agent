import useragent, { OperatingSystem } from 'useragent';
import IJa3 from '../interfaces/IJa3';
import fs from 'fs';
import IJa3BrowserProfile from '../interfaces/IJa3BrowserProfile';
import { saveUseragentProfile } from '@double-agent/runner/lib/useragentProfileHelper';

const profilesDir = process.env.PROFILES_DIR ?? `${__dirname}`;

function getAllProfiles() {
  let entries: IJa3BrowserProfile[] = [];
  for (const filepath of fs.readdirSync(profilesDir)) {
    if (!filepath.endsWith('json') || filepath.startsWith('_')) continue;
    const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
    const json = JSON.parse(file) as IJa3BrowserProfile;
    entries.push(json);
  }
  return entries;
}

export function saveJa3Profile(profile: IJa3BrowserProfile) {
  if (!process.env.GENERATE_PROFILES) return;
  saveUseragentProfile(profile.useragent, profile, profilesDir);
}

export const confirmedJa3s = getAllProfiles().map(x => {
  return {
    userAgent: useragent.lookup(x.useragent),
    ...x,
  };
});

export function isConfirmedJa3(userAgent: string, ja3Extended: IJa3) {
  const parsedUa = useragent.lookup(userAgent);

  return confirmedJa3s.find(
    x =>
      x.ja3ExtendedMd5 === ja3Extended.md5 &&
      parsedUa.family === x.userAgent.family &&
      parsedUa.major === x.userAgent.major &&
      parsedUa.os.family === x.userAgent.os.family &&
      parsedUa.os.major === x.userAgent.os.major &&
      parsedUa.os.minor === x.userAgent.os.minor,
  );
}

export function findByOs(os: OperatingSystem, browser: string) {
  return confirmedJa3s.find(
    x =>
      x.userAgent.os.family === os.family &&
      x.userAgent.os.major === os.major &&
      x.userAgent.os.minor === os.minor &&
      x.userAgent.family + ' ' + x.userAgent.major === browser,
  );
}

export const confirmedBrowsers = confirmedJa3s
  .map(x => x.userAgent.family + ' ' + x.userAgent.major)
  .reduce((list, entry) => {
    if (!list.includes(entry)) list.push(entry);
    return list;
  }, [] as string[])
  .sort();

export const uniqueConfirmedJa3s: {
  [md5: string]: { browsers: string[]; operatingSystems: string[]; useragents: string[] };
} = {};
for (const ja3 of confirmedJa3s) {
  if (!uniqueConfirmedJa3s[ja3.ja3ExtendedMd5]) {
    uniqueConfirmedJa3s[ja3.ja3ExtendedMd5] = {
      browsers: [],
      operatingSystems: [],
      useragents: [],
    };
  }
  const entry = uniqueConfirmedJa3s[ja3.ja3ExtendedMd5];
  const browser = `${ja3.userAgent.family} ${ja3.userAgent.major}`;
  if (!entry.browsers.includes(browser)) entry.browsers.push(browser);

  const os = `${ja3.userAgent.os.family} ${ja3.userAgent.os.major}.${ja3.userAgent.os.minor}`;
  if (!entry.operatingSystems.includes(os)) entry.operatingSystems.push(os);

  if (!entry.useragents.includes(ja3.useragent)) entry.useragents.push(ja3.useragent);
}

export const confirmedOperatingSystems = confirmedJa3s
  .map(x => x.userAgent.os)
  .reduce((list, entry) => {
    if (
      !list.some(
        x => x.family === entry.family && x.major === entry.major && x.minor === entry.minor,
      )
    ) {
      list.push(entry);
    }
    return list;
  }, [] as OperatingSystem[])
  .sort((a, b) => {
    if (a.family !== b.family) {
      return a.family.localeCompare(b.family);
    }
    const majorDiff = Number(b.major) - Number(a.major);
    if (majorDiff !== 0) return majorDiff;
    return Number(b.minor) - Number(a.minor);
  });
