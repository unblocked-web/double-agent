import fs from 'fs';
import { saveUseragentProfile } from '@double-agent/runner/lib/profileHelper';
import { inspect } from 'util';
import Useragent, { Agent, lookup } from 'useragent';
import HostDomain from '@double-agent/runner/interfaces/HostDomain';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import SessionTracker from '@double-agent/runner/lib/SessionTracker';
import OriginType from '@double-agent/runner/interfaces/OriginType';
import IRequestDetails from '@double-agent/runner/interfaces/IRequestDetails';

const profilesDir = process.env.PROFILES_DIR ?? `${__dirname}/../profiles`;

export default class CookieProfile {
  public readonly requests: ICookieRequest[];
  public readonly useragent: string;
  constructor(readonly ctx: IRequestContext) {
    this.useragent = ctx.requestDetails.useragent;
    this.requests = ctx.session.requests.map(x => CookieProfile.processRequestDetails(x, ctx));
  }

  public async save() {
    if (!process.env.GENERATE_PROFILES) return;

    const data = {
      requests: this.requests,
      useragent: this.useragent,
    } as ICookieProfile;

    await saveUseragentProfile(this.useragent, data, profilesDir);
  }

  public static processRequestDetails(x: IRequestDetails, ctx: IRequestContext) {
    return {
      url: x.url,
      cookieNames: Object.keys(x.cookies ?? {}),
      setCookies: x.setCookies?.map(x =>
        SessionTracker.cleanUrls(
          x,
          ctx.session.id,
          ctx.domains.secureDomains,
          ctx.domains.httpDomains,
        ),
      ),
      originType: x.originType,
      secureDomain: x.secureDomain,
      resourceType: x.resourceType,
      hostDomain: x.hostDomain,
    };
  }

  public static findUniqueProfiles(): ICookieGrouping[] {
    const profiles = this.getAllProfiles();
    const groups: {
      [json: string]: ICookieGrouping;
    } = {};

    for (const profile of profiles) {
      const requests = profile.requests
        .map(x => {
          const cookies = x.cookieNames.sort() ?? [];
          return { url: x.originType.toString() + ' >> ' + x.url, cookies: cookies };
        })
        .sort((a, b) => {
          return a.url.localeCompare(b.url);
        });
      const json = JSON.stringify(requests);
      if (groups[json]) {
        if (!groups[json].useragents.includes(profile.useragent))
          groups[json].useragents.push(profile.useragent);
      } else {
        groups[json] = { useragents: [profile.useragent], cookies: {} };
        for (const { url, cookies } of requests) {
          groups[json].cookies[url] = cookies;
        }
      }
    }
    // console.log(inspect(Object.values(groups), false, null, true));
    return Object.values(groups);
  }

  public static analyzeUniquePropertiesByBrowserGroup() {
    const groups = this.findUniqueProfiles();
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

    console.log('UNIQUE COOKIE SETTINGS BY BROWSER'.padStart(70, '-').padEnd(150, '-'));
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

  public static getAllProfiles() {
    const entries: (ICookieProfile & { userAgent: Useragent.Agent })[] = [];
    for (const filepath of fs.readdirSync(profilesDir)) {
      if (!filepath.endsWith('json') || filepath.startsWith('_')) continue;
      const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
      const json = JSON.parse(file) as ICookieProfile & { userAgent: Useragent.Agent };
      json.userAgent = lookup(json.useragent);
      entries.push(json);
    }
    return entries;
  }

  public static getProfileForSession(ctx: IRequestContext) {
    const agent = ctx.session.parsedUseragent;
    const profile = CookieProfile.getAllProfiles().find(x => {
      if (x.userAgent.major !== agent.major) return false;
      return x.userAgent.family === agent.family;
    });
    if (!profile) {
      console.log('WARN: no Cookie profile for %s %s', agent.major, agent.family);
    }
    return profile;
  }
}

export interface ICookieProfile {
  requests: ICookieRequest[];
  useragent: string;
}

export interface ICookieRequest {
  url: string;
  cookieNames: string[];
  setCookies?: string[];
  secureDomain: boolean;
  hostDomain: HostDomain;
  originType: OriginType;
  resourceType: ResourceType;
}

interface ICookieGrouping {
  useragents: string[];
  cookies: { [url: string]: string[] };
}
