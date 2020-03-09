import IDetectionSession from '../interfaces/IDetectionSession';
import IRequestDetails from '../interfaces/IRequestDetails';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import { lookup } from 'useragent';

let sessionIdCounter = 0;
export default class SessionTracker {
  private sessions: { [sessionid: string]: IDetectionSession } = {};

  constructor(readonly httpDomains: IDetectionDomains, readonly secureDomains: IDetectionDomains) {}

  public getSession(sessionid: string) {
    return this.sessions[sessionid];
  }

  public createSession(expectedUseragent: string) {
    const sessionid = String((sessionIdCounter += 1));
    this.sessions[sessionid] = {
      id: sessionid,
      requests: [],
      pluginsRun: [],
      identifiers: [],
      useragent: null,
      parsedUseragent: null,
      expectedUseragent,
      assetsNotLoaded: [],
      flaggedChecks: [],
    };
    return this.sessions[sessionid];
  }

  public recordRequest(
    requestDetails: IRequestDetails,
    requestUrl: URL,
    accessControlHeader?: string,
  ) {
    const { cookies, bodyJson, useragent } = requestDetails;

    const query = requestUrl.searchParams;
    let sessionid =
      query.get('sessionid') ??
      (bodyJson as any).sessionid ??
      cookies.sessionid ??
      this.getSessionFromAccessControlHeader(accessControlHeader) ??
      this.getSessionFromAddress(requestDetails) ??
      this.getSessionFromAddressAndPort(requestDetails);

    if (!sessionid) {
      sessionid = this.createSession(requestDetails.useragent).id;
    }

    const session = this.sessions[sessionid];
    if (!session.useragent) {
      session.useragent = useragent;
      session.parsedUseragent = lookup(useragent);
    }

    requestDetails.headers = requestDetails.headers.map(x => this.cleanDomains(x, sessionid));
    requestDetails.origin = this.cleanDomains(requestDetails.origin, sessionid);
    requestDetails.referer = this.cleanDomains(requestDetails.referer, sessionid);
    requestDetails.url = this.cleanDomains(requestDetails.url, sessionid);

    session.requests.push(requestDetails);
    return session;
  }

  private getSessionFromAddressAndPort(requestDetails: IRequestDetails) {
    const addrParts = requestDetails.remoteAddress.split(':');
    const addrPort = addrParts.pop();
    const addrIp = addrParts.join(':');

    for (const session of Object.values(this.sessions)) {
      if (
        session.requests.some(x => {
          // are any remote ips the same as this one, just off by 10 ports?
          const parts = x.remoteAddress.split(':');
          const port = parts.pop();
          const ip = parts.join(':');
          if (ip !== addrIp) return false;
          return Math.abs(Number(addrPort) - Number(port)) <= 10;
        })
      ) {
        return session.id;
      }
    }
  }

  private getSessionFromAddress(requestDetails: IRequestDetails) {
    for (const session of Object.values(this.sessions)) {
      if (session.requests.some(x => x.remoteAddress === requestDetails.remoteAddress)) {
        return session.id;
      }
    }
  }

  private getSessionFromAccessControlHeader(accessControlHeader: string) {
    const header = accessControlHeader?.split(',');
    if (header) {
      return (header.find(x => x.startsWith('x-sessionid-')) ?? '').split('-').pop();
    }
  }

  private cleanDomains(str: string, sessionid: string) {
    if (!str) return str;

    return SessionTracker.cleanUrls(str, sessionid, this.secureDomains, this.httpDomains);
  }

  public static cleanUrls(prop: string, sessionid: string, ...domains: IDetectionDomains[]) {
    if (!prop) return prop;

    let cleaned = prop;
    for (const domainset of domains) {
      const { subdomain, external, main } = domainset;
      const fullMainSite = main.host;
      const fullSubSite = subdomain.host;
      const fullCrossSite = external.host;
      cleaned = cleaned
        .replace(RegExp(fullSubSite, 'g'), 'subdomain')
        .replace(RegExp(fullMainSite, 'g'), 'main')
        .replace(RegExp(fullCrossSite, 'g'), 'external')
        .replace(RegExp(`sessionid=${sessionid}`, 'g'), 'sessionid=X');
    }
    return cleaned;
  }
}
