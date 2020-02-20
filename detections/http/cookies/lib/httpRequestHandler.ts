import { IncomingMessage, ServerResponse } from 'http';
import * as url from 'url';
import processCookieRequest, { IRequestInfo } from './processCookieRequest';
import CookieProfile from './CookieProfile';
import IDomainset, { cleanDomain } from '../interfaces/IDomainset';
import * as fs from 'fs';
import testCookieProfile from './testCookieProfile';

export default function httpRequestHandler(
  domains: IDomainset,
  otherDomain: IDomainset,
  onProfileGenerated: (profile: CookieProfile) => void,
) {
  const thisProtocol = domains.isSsl ? 'https://' : 'http://';
  const fullMainSite = thisProtocol + cleanDomain(domains.main, domains.port);
  const fullSameSite = thisProtocol + cleanDomain(domains.sameSite, domains.port);
  const fullCrossSite = thisProtocol + cleanDomain(domains.crossSite, domains.port);
  return async function requestHandler(req: IncomingMessage, res: ServerResponse) {
    console.log('inbound request')
    try {
      const requestUrl = url.parse(req.url);
      if (requestUrl.pathname === '/favicon.ico') {
        return res.writeHead(404).end('');
      }
      const host = req.headers.host;

      const cookieDomain = host.startsWith(domains.main)
        ? 'mainSiteOrigin'
        : host.startsWith(domains.crossSite)
        ? 'crossSiteOrigin'
        : 'sameSiteOrigin';
      const cookiePrefix = domains.isSsl ? 'secure-' : '';
      if (
        !host.includes(domains.main) &&
        !host.includes(domains.crossSite) &&
        !host.includes(domains.sameSite)
      ) {
        console.log('host doesn\'t include one of the main domains', domains, host)
        return messageReply(
          res,
          400,
          'Please visit this site at ' + fullMainSite + ' + vs ' + host,
        );
      }
      const { key, requests, entry } = await processCookieRequest(req, domains);

      function runRedirect(dest: string, cookies = true) {
        const headers: any = {
          location: dest + '?hkey=' + key,
        };
        if (cookies) {
          entry.setCookies = [
            cookieDomain + '-ToBeExpired=start; expires=Thu, 01 Jan 1970 00:00:00 GMT',
            ...getSetCookies(cookieDomain, cookiePrefix + requestUrl.pathname.slice(1), domains),
          ];
          headers['Set-cookie'] = entry.setCookies;
        }
        res.writeHead(302, headers);
        res.end();
      }

      if (requestUrl.pathname === '/') {
        sendStartPage(res, domains, key, entry);
      } else if (requestUrl.pathname === '/run') {
        runRedirect(fullSameSite + '/run-redirect', true);
      } else if (requestUrl.pathname === '/run-redirect') {
        runRedirect(fullCrossSite + '/do-run', true);
      } else if (requestUrl.pathname === '/do-run') {
        entry.setCookies = [
          cookieDomain + '-ToBeExpired=start; expires=Thu, 01 Jan 1970 00:00:00 GMT',
          ...getSetCookies(cookieDomain, cookiePrefix + 'do-run', domains),
        ];
        res.writeHead(200, {
          'content-type': 'text/html',
          'Set-cookie': entry.setCookies,
        });
        res.end(buildIndexHtml(key, domains, otherDomain, cookieDomain));
      } else if (requestUrl.pathname === '/style.css' || requestUrl.pathname === '/main.css') {
        const headers: any = {
          'Content-Type': 'text/css',
        };

        if (requestUrl.pathname === '/main.css') {
          entry.setCookies = getSetCookies(cookieDomain, cookiePrefix + 'css', domains);
          headers['Set-Cookie'] = entry.setCookies;
        }

        res.writeHead(200, headers);
        fs.createReadStream(__dirname + '/../public/main.css').pipe(res, {
          end: true,
        });
      } else if (requestUrl.pathname === '/results') {
        runRedirect(fullSameSite + '/results-redirect', false);
      } else if (requestUrl.pathname === '/results-redirect') {
        runRedirect(fullMainSite + '/results-final', false);
      } else if (requestUrl.pathname === '/results-final') {
        const profile = new CookieProfile(
          requests,
          domains,
          otherDomain,
          req.headers['user-agent'],
        );
        profile.save();

        const results = testCookieProfile(profile);
        console.log(
          '%s Cookie Discrepencies',
          results.filter(x => !x.success).length,
          results,
        );

        onProfileGenerated(profile);

        res.writeHead(200, {
          'content-type': 'text/html',
        });
        res.end(buildResultsHtml(profile.cleanedRequests));
      } else {
        res.writeHead(500);
        res.end('Not implemented');
      }
    } catch (err) {
      console.log('Request error %s %s', req.method, req.url, err);
    }
  };
}

function buildIndexHtml(
  key: string,
  domains: IDomainset,
  otherDomain: IDomainset,
  cookieDomain: string,
) {
  const fullOtherMainsite =
    (otherDomain.isSsl ? 'https://' : 'http://') + cleanDomain(otherDomain.main, otherDomain.port);

  return `<html>
<head>
    <link rel="stylesheet" type="text/css" href="${fullOtherMainsite}/main.css?hkey=${key}" type="text/css"/>
</head>
<body onload="pageLoad()">
<h1>Cookie Test</h1>
<br/><br/>
<script>
    document.cookie = '${cookieDomain}-JsCookies=0';
    if(document.cookie.includes('HttpOnly-')) {
        document.cookie = '${cookieDomain}-CanReadHttpOnly=0';
    }
</script>

<a id="results" href="/results?hkey=${key}">Get Results</a>

<script>
   function pageLoad(){
     document.querySelector('#results').classList.add('ready')
   }
</script>
</body>
</html>`;
}

function sendStartPage(res: ServerResponse, domains: IDomainset, key: string, entry: IRequestInfo) {
  const fullSameSite = cleanDomain(domains.sameSite, domains.port);

  entry.setCookies = [
    `mainSiteOrigin-ToBeExpired=start;`,
    ...getSetCookies('mainSiteOrigin', 'start', domains),
  ];
  res.writeHead(200, {
    'content-type': 'text/html',
    'set-cookie': entry.setCookies,
  });
  res.end(
    `<html>
<head>
    <link rel="stylesheet" type="text/css" href="//${fullSameSite}/main.css?hkey=${key}" type="text/css"/>
</head>
<body onload="pageLoad()">
<div style="margin: 0 auto">
<h3>Setup</h3>
<p>Add the following entries to /etc/hosts if running locally</p>
<pre>
127.0.0.1      ${domains.main}
127.0.0.1      ${domains.sameSite}
127.0.0.1      ${domains.crossSite}
</pre>
${domains.isSsl ? '<p>You need to run Chrome with self-signed certs allowed</p>' : ''}
<h3>Then click start to begin</h3>
<a id="start" href="/run?hkey=${key}">start</a>
<hr/>
</div>
</body>
<script>
 function pageLoad(){
   document.querySelector('#start').classList.add('ready')
 }
</script>
</html>
`,
  );
}

function getSetCookies(
  origin: 'mainSiteOrigin' | 'sameSiteOrigin' | 'crossSiteOrigin',
  source: string,
  domains: IDomainset,
) {
  const cookies = [
    origin + `-SecureSameLax-${source}=0; Secure; SameSite=Lax`,
    origin + `-SecureSameStrict-${source}=0; Secure; SameSite=Strict`,
    origin + `-SecureSameNone-${source}=0; Secure; SameSite=None`,
    origin + `-Secure-${source}=0; Secure`,
    origin + `-SameLax-${source}=0; SameSite=Lax`,
    origin + `-SameStrict-${source}=0; SameSite=Strict`,
    origin + `-SameNone-${source}=0; SameSite=None`,
    origin + `-HttpOnly-${source}=0; HttpOnly`,
    origin + `-${source}=0`,
    origin + `-Expired-${source}=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    '__Secure-' + origin + `-SecurePrefix-${source}=0; Secure`,
    '__Host-' + origin + `-HostPrefix-${source}=0; Secure; Path=/`,
  ];

  if (origin === 'mainSiteOrigin' || origin === 'sameSiteOrigin') {
    const hostDomain = domains.main
      .split('.')
      .slice(-2)
      .join('.');

    cookies.push(
      origin + `-RootDomainHttpOnly-${source}=0; HttpOnly; Domain=` + hostDomain,
      origin + `-RootDomainSameNone-${source}=0; SameSite=None; Domain=` + hostDomain,
      origin + `-RootDomainSecureSameLax-${source}=0; Secure; SameSite=Lax; Domain=` + hostDomain,
      origin +
        `-RootDomainSecureSameStrict-${source}=0; Secure; SameSite=Strict; Domain=` +
        hostDomain,
      origin + `-RootDomainSecureSameNone-${source}=0; Secure; SameSite=None; Domain=` + hostDomain,
    );
  }

  return cookies;
}

function buildResultsHtml(entries: IRequestInfo[]) {
  const records = entries
    .map(x => {
      return `<tr>
<td>${x.referer}</td>
<td>${x.url}</td>
<td><pre>${x.cookies
        ?.split('; ')
        .sort()
        .join('\n')}</pre>
<td><pre>${x.setCookies?.join('\n')}</pre>
</td>
    </tr>`;
    })
    .join('');
  return `<html>
<head>
    <link rel="stylesheet" type="text/css" href="style.css?hkey=ignore" type="text/css"/>
</head>
<bod id="final"y>
<h1>Cookie Test</h1>
<br/><br/>
<table>
<thead><tr><th>Referer</th><th>Url</th><th>Cookies</th><th>Set Cookies</th></tr></thead>
<tbody>
${records}
</tbody>
</table>
</body>
</html>`;
}

function messageReply(res: ServerResponse, statusCode: number, message: string) {
  res.writeHead(statusCode, {
    'content-type': 'text/html',
  });
  res.write(`<html><body><bold style="color:red">${message}</bold></body></html>`);
  res.end();
}
