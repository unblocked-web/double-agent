import fs from 'fs';
import IJa3BrowserProfile from '../interfaces/IJa3BrowserProfile';
import { saveUseragentProfile } from '@double-agent/runner/lib/profileHelper';
import useragent, { Agent, OperatingSystem } from 'useragent';
import IJa3 from '../interfaces/IJa3';

const profilesDir = process.env.PROFILES_DIR ?? `${__dirname}/../profiles`;

export default class ClientHelloProfile {
  public static allProfiles: IJa3BrowserProfile[];
  public static confirmedJa3s: (IJa3BrowserProfile & { userAgent: Agent })[];
  public static confirmedBrowsers: string[];
  public static uniqueConfirmedJa3s: {
    [md5: string]: { browsers: string[]; operatingSystems: string[]; useragents: string[] };
  } = {};
  public static confirmedOperatingSystems: OperatingSystem[];

  public static saveProfile(profile: IJa3BrowserProfile) {
    if (!process.env.GENERATE_PROFILES) return;
    saveUseragentProfile(profile.useragent, profile, profilesDir);
  }

  public static isConfirmedJa3(userAgent: string, ja3Extended: IJa3) {
    const parsedUa = useragent.lookup(userAgent);

    return this.confirmedJa3s.find(
      x =>
        x.ja3ExtendedMd5 === ja3Extended.md5 &&
        parsedUa.family === x.userAgent.family &&
        parsedUa.major === x.userAgent.major &&
        parsedUa.os.family === x.userAgent.os.family &&
        parsedUa.os.major === x.userAgent.os.major &&
        parsedUa.os.minor === x.userAgent.os.minor,
    );
  }

  public static findByOs(os: OperatingSystem, browser: string) {
    return this.confirmedJa3s.find(
      x =>
        x.userAgent.os.family === os.family &&
        x.userAgent.os.major === os.major &&
        x.userAgent.os.minor === os.minor &&
        x.userAgent.family + ' ' + x.userAgent.major === browser,
    );
  }
}

(function init() {
  let entries: IJa3BrowserProfile[] = [];
  for (const filepath of fs.readdirSync(profilesDir)) {
    if (!filepath.endsWith('json') || filepath.startsWith('_')) continue;
    const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
    const json = JSON.parse(file) as IJa3BrowserProfile;
    entries.push(json);
  }
  ClientHelloProfile.allProfiles = entries;
  ClientHelloProfile.confirmedJa3s = entries.map(x => {
    return {
      userAgent: useragent.lookup(x.useragent),
      ...x,
    };
  });
  ClientHelloProfile.confirmedBrowsers = ClientHelloProfile.confirmedJa3s
    .map(x => x.userAgent.family + ' ' + x.userAgent.major)
    .reduce((list, entry) => {
      if (!list.includes(entry)) list.push(entry);
      return list;
    }, [] as string[])
    .sort();

  const uniqueConfirmedJa3s = ClientHelloProfile.uniqueConfirmedJa3s;
  for (const ja3 of ClientHelloProfile.confirmedJa3s) {
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

  ClientHelloProfile.confirmedOperatingSystems = ClientHelloProfile.confirmedJa3s
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
})();
