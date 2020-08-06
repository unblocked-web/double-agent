import IRequestDetails from '../interfaces/IRequestDetails';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import { v1 } from 'uuid';
import HostDomain from '../interfaces/HostDomain';
import UserBucket from '../interfaces/UserBucket';
import DetectionSession from './DetectionSession';
import { URL } from 'url';
import IAssignment from "../interfaces/IAssignment";

let sessionIdCounter = 0;
export default class SessionTracker {
  private sessions: { [sessionId: string]: DetectionSession } = {};

  constructor(readonly httpDomains: IDetectionDomains, readonly secureDomains: IDetectionDomains) {}

  public getSession(sessionId: string) {
    return this.sessions[sessionId];
  }

  public deleteSession(sessionId: string) {
    delete this.sessions[sessionId];
  }

  public createSession(expectedUseragent: string, assignment?: IAssignment) {
    const sessionId = String((sessionIdCounter += 1));

    const session = new DetectionSession(sessionId, assignment);
    session.expectedUseragent = expectedUseragent;
    this.sessions[sessionId] = session;
    return session;
  }

  public recordRequest(
    requestDetails: IRequestDetails,
    requestUrl: URL,
    accessControlHeader?: string,
  ) {
    const { cookies, bodyJson, useragent } = requestDetails;

    const query = requestUrl.searchParams;
    let sessionId =
      query.get('sessionid') ??
      (bodyJson as any).sessionid ??
      cookies.sessionid ??
      this.getSessionFromAccessControlHeader(accessControlHeader) ??
      this.getSessionFromAddress(requestDetails) ??
      this.getSessionFromAddressAndPort(requestDetails);

    if (!sessionId) {
      sessionId = this.createSession(requestDetails.useragent).id;
    }

    const session = this.sessions[sessionId];
    if (!session.useragent) {
      session.setUseragent(useragent);
    }

    if (!session.userUuid && requestDetails.hostDomain !== HostDomain.External) {
      session.userUuid = cookies['uuid'];
      if (!session.userUuid) {
        session.userUuid = v1();
        requestDetails.setCookies.push(
          `uuid=${session.userUuid}; Secure; SameSite=None; HttpOnly;`,
        );
      }
      session.identifiers.push({
        bucket: UserBucket.UserCookie,
        id: session.userUuid,
        description: 'A distinct cookie set per user',
        layer: 'http',
        category: 'Cookie Support'
      });
    }
    requestDetails.headers = requestDetails.headers.map(x => this.cleanDomains(x, sessionId));
    requestDetails.origin = this.cleanDomains(requestDetails.origin, sessionId);
    requestDetails.referer = this.cleanDomains(requestDetails.referer, sessionId);
    requestDetails.url = this.cleanDomains(requestDetails.url, sessionId);

    session.requests.push(requestDetails);

    if (!requestDetails.cookies.sessionid) {
      const cookie = `sessionid=${session.id}; HttpOnly;`;
      requestDetails.setCookies.push(cookie);
    }
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

  private cleanDomains(str: string, sessionId: string) {
    if (!str) return str;

    return SessionTracker.cleanUrls(str, sessionId, this.secureDomains, this.httpDomains);
  }

  public static cleanUrls(prop: string, sessionId: string, ...domains: IDetectionDomains[]) {
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
        .replace(RegExp(`sessionid=${sessionId}`, 'g'), 'sessionid=X');
    }
    return cleaned;
  }
}
