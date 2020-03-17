import fs from 'fs';
import { saveUseragentProfile } from '@double-agent/runner/lib/profileHelper';
import OriginType from '@double-agent/runner/interfaces/OriginType';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import { inspect } from 'util';

const profilesDir = process.env.PROFILES_DIR ?? `${__dirname}/../profiles`;

export default class IpProfile {
  constructor(readonly useragent: string, readonly requests: IIpRequest[]) {}

  public save() {
    if (!process.env.GENERATE_PROFILES) return;
    const data = { useragent: this.useragent, requests: this.requests } as IIpProfile;
    saveUseragentProfile(this.useragent, data, profilesDir);
  }

  public static fromContext(ctx: IRequestContext) {
    const requests = ctx.session.requests.map(
      x =>
        ({
          remoteAddress: x.remoteAddress,
          secureDomain: x.secureDomain,
          originType: x.originType,
          resourceType: x.resourceType,
          referer: x.referer,
          url: x.url,
        } as IIpRequest),
    );
    return new IpProfile(ctx.session.useragent, requests);
  }

  public static getPortRange(portString: string | number) {
    const port = Number(portString);
    const modulus = port % 500;
    const startPort = modulus > 250 ? port - modulus : port - (port % 500) - 500;

    return `${startPort}-${startPort + 1000}`;
  }

  public static analyze() {
    const profiles = IpProfile.getAllProfiles();
    const socketsPerSession: IIpAddressGroup[] = [];
    for (const profile of profiles) {
      const session: IIpAddressGroup = {
        useragent: profile.useragent,
        secureSockets: 0,
        httpSockets: 0,
        portRanges: [],
        securePorts: [],
        httpPorts: [],
        socketsPerPage: [],
        portUses: {},
      };
      socketsPerSession.push(session);

      for (const request of profile.requests) {
        const port = Number(request.remoteAddress.split(':').pop());
        const portRange = IpProfile.getPortRange(port);
        if (!session.portRanges.includes(portRange)) session.portRanges.push(portRange);

        let page = session.socketsPerPage.find(x => x.url === request.referer);
        if (!session.portUses[port]) session.portUses[port] = [];
        session.portUses[port].push(
          `${request.originType} ${request.resourceType} from ${request.referer?.replace(
            '?sessionid=X',
            '',
          )}`,
        );

        if (!page) {
          page = {
            url: request.referer,
            httpPorts: [],
            securePorts: [],
            requests: 0,
          };
          session.socketsPerPage.push(page);
        }

        page.requests += 1;

        if (request.secureDomain === true) {
          if (!session.securePorts.includes(port)) {
            session.securePorts.push(port);
            session.secureSockets += 1;
            session.securePorts.sort();
          }
          if (!page.securePorts.includes(port)) {
            page.securePorts.push(port);
            page.securePorts.sort();
          }
        } else if (!session.httpPorts.includes(port)) {
          session.httpPorts.push(port);
          session.httpSockets += 1;
          session.httpPorts.sort();

          if (!page.httpPorts.includes(port)) {
            page.httpPorts.push(port);
            page.httpPorts.sort();
          }
        }
      }
    }
    console.log(
      inspect(
        socketsPerSession.map(x => {
          const portUses = Object.entries(x.portUses).map(([port, uses]) => uses.length);
          const avgPortUses = portUses.reduce((p, c) => p + c, 0) / portUses.length;
          return {
            ranges: x.portRanges,
            securePorts: x.securePorts.length,
            httpPorts: x.httpPorts.length,
            overlappingPorts: x.securePorts.filter(y => x.httpPorts.includes(y)).length,
            requestsPerPort: Math.round(avgPortUses * 100) / 100,
            minRequestsPerPort: Math.min(...portUses),
            maxRequestsPerPort: Math.max(...portUses)
          };
        }),
        false,
        null,
        true,
      ),
    );
  }

  public static getAllProfiles() {
    const entries: IIpProfile[] = [];
    for (const filepath of fs.readdirSync(profilesDir)) {
      if (!filepath.endsWith('json') || filepath.startsWith('_')) continue;
      const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
      const json = JSON.parse(file) as IIpProfile;
      entries.push(json);
    }
    return entries;
  }
}

interface IIpAddressGroup {
  useragent: string;
  secureSockets: number;
  httpSockets: number;
  securePorts: number[];
  httpPorts: number[];
  portRanges: string[];
  socketsPerPage: { url: string; securePorts: number[]; httpPorts: number[]; requests: number }[];
  portUses: { [port: number]: string[] };
}

interface IIpProfile {
  requests: IIpRequest[];
  useragent: string;
}

interface IIpRequest {
  url: string;
  originType: OriginType;
  resourceType: ResourceType;
  referer: string;
  secureDomain: boolean;
  remoteAddress: string;
}
