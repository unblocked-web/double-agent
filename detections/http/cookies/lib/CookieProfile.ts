import Useragent, { lookup } from 'useragent';
import HostDomain from '@double-agent/runner/interfaces/HostDomain';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import SessionTracker from '@double-agent/runner/lib/SessionTracker';
import OriginType from '@double-agent/runner/interfaces/OriginType';
import IRequestDetails from '@double-agent/runner/interfaces/IRequestDetails';
import ProfilerData from '@double-agent/profiler/data';

const pluginId = 'http/cookies';

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

    await ProfilerData.saveProfile(pluginId, this.useragent, data);
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
    return Object.values(groups);
  }

  public static getAllProfiles() {
    const entries: (ICookieProfile & { userAgent: Useragent.Agent })[] = [];
    ProfilerData.getByPluginId(pluginId).forEach(entry => {
      entry.userAgent = lookup(entry.useragent);
      entries.push(entry as ICookieProfile & { userAgent: Useragent.Agent });
    });
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
