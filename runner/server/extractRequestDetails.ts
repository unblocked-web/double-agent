import * as http from 'http';
import { IncomingMessage } from 'http';
import ResourceType from '../interfaces/ResourceType';
import cookie from 'cookie';
import IRequestDetails from '../interfaces/IRequestDetails';
import HostDomain from '../interfaces/HostDomain';
import IDomainset from '../interfaces/IDomainset';
import OriginType from '../interfaces/OriginType';

export default async function extractRequestDetails(
  req: http.IncomingMessage,
  domains: IDomainset,
  overrideResourceType?: ResourceType,
) {
  const useragent = req.headers['user-agent'];
  const addr = req.connection.remoteAddress.split(':').pop() + ':' + req.connection.remotePort;
  const listeningDomain = domains.listeningDomains;
  const requestUrl = new URL(`${listeningDomain.main.protocol}//${req.headers.host}${req.url}`);

  let body = '';
  let bodyJson: any = {};
  for await (const chunk of req) {
    body += chunk.toString();
  }
  if (req.headers['content-type'] === 'application/json') {
    bodyJson = JSON.parse(body);
  }

  const cookies = cookie.parse(req.headers.cookie ?? '');
  const rawHeaders = parseHeaders(req.rawHeaders);

  const requestDetails: IRequestDetails = {
    useragent,
    bodyJson,
    cookies,
    setCookies: [],
    remoteAddress: addr,
    url: requestUrl.href,
    origin: req.headers['origin'] as string,
    originType: OriginType.None,
    referer: req.headers.referer,
    method: req.method,
    headers: rawHeaders,
    hostDomain: HostDomain.Main,
    secureDomain: listeningDomain.isSSL,
    resourceType: overrideResourceType ?? getResourceType(req, requestUrl.pathname),
  };

  if (
    requestUrl.host === domains.secureDomains.subdomain.host ||
    requestUrl.host === domains.httpDomains.subdomain.host
  ) {
    requestDetails.hostDomain = HostDomain.Sub;
  } else if (
    requestUrl.host === domains.secureDomains.external.host ||
    requestUrl.host === domains.httpDomains.external.host
  ) {
    requestDetails.hostDomain = HostDomain.External;
  } else {
    requestDetails.hostDomain = HostDomain.Main;
  }

  // if origin sent, translate into origin type
  if (requestDetails.origin) {
    requestDetails.originType = getOriginType(
      new URL(requestDetails.origin),
      requestDetails.hostDomain,
      domains,
    );
  } else if (requestDetails.referer) {
    requestDetails.originType = getOriginType(
      new URL(requestDetails.referer),
      requestDetails.hostDomain,
      domains,
    );
  }

  return {
    requestDetails,
    requestUrl,
    accessControlHeader: req.headers['access-control-request-headers'] as string,
  };
}

function getOriginType(referer: URL, host: HostDomain, domains: IDomainset) {
  if (!referer) return OriginType.None;
  let refererDomain = HostDomain.Main;
  if (
    referer.host === domains.secureDomains.subdomain.host ||
    referer.host === domains.httpDomains.subdomain.host
  ) {
    refererDomain = HostDomain.Sub;
  } else if (
    referer.host === domains.secureDomains.external.host ||
    referer.host === domains.httpDomains.external.host
  ) {
    refererDomain = HostDomain.External;
  }

  if (host === refererDomain) return OriginType.SameOrigin;
  if (host === HostDomain.Sub && refererDomain === HostDomain.Main) return OriginType.SameSite;
  if (host === HostDomain.Main && refererDomain === HostDomain.Sub) return OriginType.SameSite;
  return OriginType.CrossSite;
}

function getResourceType(req: IncomingMessage, pathname: string) {
  if (pathname === '/' || pathname.includes('-page')) {
    return ResourceType.Document;
  }
  if (pathname === '/run' || pathname === '/results' || pathname.includes('-redirect')) {
    return ResourceType.Redirect;
  }
  if (req.method === 'OPTIONS') {
    return ResourceType.Preflight;
  }
  if (pathname.endsWith('.js')) {
    return ResourceType.Script;
  }
  if (pathname.endsWith('.css')) {
    return ResourceType.Stylesheet;
  }
  if (pathname.endsWith('.png') || pathname.endsWith('.svg')) {
    return ResourceType.Image;
  }
  if (pathname.endsWith('.ico')) {
    return ResourceType.Ico;
  }

  return ResourceType.Xhr;
}

function parseHeaders(rawHeaders: string[]) {
  const headers = rawHeaders;
  const headerPrintout = [];
  for (let i = 0; i < headers.length; i += 2) {
    const key = headers[i];
    const value = headers[i + 1];
    headerPrintout.push(`${key}=${value}`);
  }
  return headerPrintout;
}
