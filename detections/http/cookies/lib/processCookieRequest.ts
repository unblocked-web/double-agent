import * as http from 'http';
import url from 'url';
import querystring from 'querystring';
import IDomainset from '../interfaces/IDomainset';

let counter = 0;
const remotes: { [key: string]: IRequestInfo[] } = {};

export default async function processCookieRequest(req: http.IncomingMessage, domains: IDomainset) {
  console.log(
    'Request %s: %s from %s with cookies %s',
    req.method,
    (domains.isSsl ? 'https://' : 'http://') + req.headers.host + req.url,
    req.headers.referer,
    req.headers.cookie,
  );
  const requestUrl = url.parse(req.url);
  const query = querystring.parse(requestUrl.query);

  let key = query.hkey as string;
  if (key === 'ignore') return { key };
  if (!key) {
    key = String((counter += 1));
  }
  if (!remotes[key]) remotes[key] = [];

  const entry: IRequestInfo = {
    url: `http${domains.isSsl ? 's' : ''}://${req.headers.host}${req.url}`,
    cookies: req.headers.cookie,
    referer: req.headers.referer,
  };

  remotes[key].push(entry);
  return {
    key,
    entry,
    requests: remotes[key],
  };
}

export interface IRequestInfo {
  url: string;
  cookies: string;
  setCookies?: string[];
  referer: string;
  type?: string;
}
