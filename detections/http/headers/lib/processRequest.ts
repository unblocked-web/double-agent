import * as http from 'http';
import cookie from 'cookie';
import url from 'url';
import querystring from 'querystring';
import IDomainset from '../interfaces/IDomainset';

let counter = 0;
const remotes: { [key: string]: IRequestInfo[] } = {};

export default async function processRequest(
  req: http.IncomingMessage,
  overrideUrl: string = null,
  domains: IDomainset,
) {
  const userAgent = req.headers['user-agent'];

  const addr = req.connection.remoteAddress.split(':').pop() + ':' + req.connection.remotePort;
  console.log(
    'Request %s: %s from %s at %s',
    req.method,
    req.headers.host + req.url,
    addr,
    userAgent,
  );
  const rawHeaders = parseHeaders(req.rawHeaders);

  let body = '';
  let bodyJson: any = {};
  for await (const chunk of req) {
    body += chunk.toString();
  }
  if (body) bodyJson = JSON.parse(body);
  const cookies = cookie.parse(req.headers.cookie ?? '');
  const requestUrl = url.parse(req.url);
  const query = querystring.parse(requestUrl.query);

  let key = query.hkey ?? bodyJson.hkey ?? cookies.key;
  if (!overrideUrl && requestUrl.pathname === '/run') {
    key = String((counter += 1));
    remotes[key] = [];
  }
  if (!key) {
    const header = (req.headers['access-control-request-headers'] as string)?.split(',');
    if (header) {
      key = (header.find(x => x.startsWith('x-key-')) ?? '').split('-').pop();
    }
    if (!key) {
      for (const [remotekey, value] of Object.entries(remotes)) {
        if (value.some(x => x.addr === addr)) {
          key = remotekey;
          break;
        }
      }
    }
    if (!key) {
      for (const [remotekey, value] of Object.entries(remotes)) {
        const addrParts = addr.split(':');
        const addrPort = addrParts.pop();
        const addrIp = addrParts.join(':');
        if (
          value.some(x => {
            // are any remote ips the same as this one, just off by 10 ports?
            const parts = x.addr.split(':');
            const port = parts.pop();
            const ip = parts.join(':');
            if (ip !== addrIp) return false;
            if (Math.abs(Number(addrPort) - Number(port)) > 10) {
              return false;
            }
            return true;
          })
        ) {
          key = remotekey;
          break;
        }
      }
    }
  }

  const entry: IRequestInfo = {
    addr,
    userAgent,
    url: `http${domains.isSsl ? 's' : ''}://${req.headers.host}${req.url}`,
    method: req.method,
    cookieKey: cookies.key,
    headers: rawHeaders,
    paramKey: query.hkey ?? bodyJson.hkey,
  };

  if (overrideUrl) {
    entry.type = overrideUrl;
  } else if (requestUrl.pathname === '/run') {
    entry.type = 'Document';
  } else if (req.method === 'OPTIONS') {
    entry.type = 'Preflight';
  } else if (requestUrl.pathname === '/headers') {
    entry.type = 'Xhr';
  } else if (requestUrl.pathname === '/headers.json') {
    entry.type = 'Xhr';
  } else if (requestUrl.pathname === '/main.js') {
    entry.type = 'Script';
  } else if (requestUrl.pathname === '/main.css') {
    entry.type = 'Stylesheet';
  } else if (requestUrl.pathname === '/world.png') {
    entry.type = 'Image';
  } else if (requestUrl.pathname === '/icon-wildcard.svg') {
    entry.type = 'Image';
  } else if (requestUrl.pathname === '/favicon.ico') {
    entry.type = 'Ico';
  } else {
    entry.type = 'Xhr';
  }
  if (entry.url.includes(domains.sameSite)) {
    entry.type = `Same Site ${entry.type}`;
  } else if (entry.url.includes(domains.crossSite)) {
    entry.type = `Cross Domain ${entry.type}`;
  }
  if (req.method === 'POST') {
    entry.type += ' - Post';
  }

  remotes[key].push(entry);
  return {
    key,
    addr,
    entry,
    entries: remotes[key],
  };
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

export interface IRequestInfo {
  url: string;
  method: string;
  addr: string;
  userAgent: string;
  headers: string[];
  cookieKey: string;
  paramKey: string;
  type?: string;
}
