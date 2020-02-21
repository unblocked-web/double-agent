import fs from 'fs';
import { IRequestInfo } from './processCookieRequest';
import { json } from '../../../../../ulixee/shared/types';
import IDomainset, { cleanDomain } from '../interfaces/IDomainset';
import { saveUseragentProfile } from '@double-agent/runner/lib/useragentProfileHelper';
import { inspect } from 'util';
import Useragent, { lookup } from 'useragent';

const profilesDir = process.env.PROFILES_DIR ?? `${__dirname}/../profiles`;
const httpsProfilesDir = `${profilesDir}/https`;
const httpProfilesDir = `${profilesDir}/http`;

if (!fs.existsSync(httpsProfilesDir)) fs.mkdirSync(httpsProfilesDir);
if (!fs.existsSync(httpProfilesDir)) fs.mkdirSync(httpProfilesDir);

export default class CookieProfile {
  public readonly cleanedRequests: IRequestInfo[];
  constructor(
    readonly requests: IRequestInfo[],
    readonly domains: IDomainset,
    readonly otherDomains: IDomainset,
    readonly useragent: string,
  ) {
    this.cleanedRequests = this.parseEntries();
  }

  public save() {
    if (!process.env.GENERATE_PROFILES) return;
    const profilesDir = this.domains.isSsl ? httpsProfilesDir : httpProfilesDir;

    const data = {
      requests: this.cleanedRequests,
      useragent: this.useragent,
    } as ICookieProfile;

    saveUseragentProfile(this.useragent, data, profilesDir);
  }

  private parseEntries(): IRequestInfo[] {
    return this.requests.map(x => ({
      ...x,
      url: this.cleanUrl(x.url),
      referer: this.cleanUrl(x.referer),
    }));
  }

  private cleanUrl(url: string) {
    if (!url) return url;
    const { sameSite, crossSite, main, port } = this.domains;
    const fullMainSite = cleanDomain(main, port);
    const fullSameSite = cleanDomain(sameSite, port);
    const fullCrossSite = cleanDomain(crossSite, port);
    const fullOtherMainSite = cleanDomain(this.otherDomains.main, this.otherDomains.port);
    const fullOtherCrossSite = cleanDomain(this.otherDomains.crossSite, this.otherDomains.port);
    const fullOtherSameSite = cleanDomain(this.otherDomains.sameSite, this.otherDomains.port);
    return url
      .replace(fullSameSite, 'sameSite')
      .replace(fullMainSite, 'mainSite')
      .replace(fullCrossSite, 'crossSite')
      .replace(fullOtherSameSite, 'sameSite')
      .replace(fullOtherMainSite, 'mainSite')
      .replace(fullOtherCrossSite, 'crossSite')
      .replace(sameSite, 'sameSite')
      .replace(main, 'mainSite')
      .replace(crossSite, 'crossSite')
      .split('?')
      .shift();
  }

  public static findUniqueProfiles(type: 'http' | 'https'): ICookieGrouping[] {
    const profiles = this.getAllProfiles(type);
    const groups: {
      [json: string]: ICookieGrouping;
    } = {};

    for (const profile of profiles) {
      const requests = profile.requests
        .map(x => {
          const cookies =
            x.cookies
              ?.split('; ')
              .map(y => y.split('=').shift())
              .sort() ?? [];
          return { url: x.referer + ' >> ' + x.url, cookies: cookies };
        })
        .sort((a, b) => {
          return a.url.localeCompare(b.url);
        });
      const json = JSON.stringify(requests);
      if (groups[json]) {
        if (!groups[json].useragents.includes(profile.useragent))
          groups[json].useragents.push(profile.useragent);
      } else {
        groups[json] = { useragents: [profile.useragent], cookies: {}, type };
        for (const { url, cookies } of requests) {
          groups[json].cookies[url] = cookies;
        }
      }
    }
    // console.log(inspect(Object.values(groups), false, null, true));
    return Object.values(groups);
  }

  public static analyzeUniquePropertiesByBrowserGroup(type: 'http' | 'https') {
    const groups = this.findUniqueProfiles(type);
    if (!groups.length) return;
    // cheap clone
    const uniqueGroups: ICookieGrouping[] = JSON.parse(JSON.stringify(Object.values(groups)));

    const firstGroup = uniqueGroups[0];
    for (const url of Object.keys(firstGroup.cookies)) {
      const urlCookieCounts: { [cookie: string]: number } = {};
      for (const group of uniqueGroups) {
        for (const cookie of group.cookies[url]) {
          urlCookieCounts[cookie] = (urlCookieCounts[cookie] ?? 0) + 1;
        }
      }
      for (const value of uniqueGroups) {
        value.cookies[url] = value.cookies[url].filter(x => {
          return urlCookieCounts[x] !== uniqueGroups.length;
        });
      }
    }

    console.log(
      ('UNIQUE ' + type + ' COOKIE SETTINGS BY BROWSER').padStart(70, '-').padEnd(150, '-'),
    );
    for (const group of uniqueGroups) {
      const uas = [
        ...new Set(group.useragents.map(x => lookup(x)).map(x => x.family + ' ' + x.major)),
      ];
      const uniqueProps = {};
      Object.entries(group.cookies).forEach(([url, cookies]) => {
        const filtered = cookies.filter(x => x.length);
        if (filtered.length) uniqueProps[url] = filtered;
      });
      console.log(`\n${uas.join(', ')}\n`, inspect(uniqueProps, false, null, true));
    }
    console.log('\n\n'.padStart(152, '-'));
  }

  public static getAllProfiles(type: 'http' | 'https') {
    const profilesDir = type === 'https' ? httpsProfilesDir : httpProfilesDir;
    const entries: (ICookieProfile & { userAgent: Useragent.Agent })[] = [];
    for (const filepath of fs.readdirSync(profilesDir)) {
      if (!filepath.endsWith('json') && !filepath.startsWith('_')) continue;
      const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
      const json = JSON.parse(file) as ICookieProfile & { userAgent: Useragent.Agent };
      json.userAgent = lookup(json.useragent);
      entries.push(json);
    }
    return entries;
  }
}

export interface ICookieProfile {
  requests: IRequestInfo[];
  useragent: string;
}

interface ICookieGrouping {
  type: 'http' | 'https';
  useragents: string[];
  cookies: { [url: string]: string[] };
}
