import { IncomingMessage, ServerResponse } from 'http';
import * as url from 'url';
import processRequest, { IRequestInfo } from './processRequest';
import * as fs from 'fs';
import Profile, { ICleanedRequestInfo } from './Profile';
import generateXhrTests from './generateXhrTests';
import IDomainset, { cleanDomain } from '../interfaces/IDomainset';

const serveFiles = {
  '/main.js': 'application/javascript',
  '/main.css': 'text/css',
  '/world.png': 'image/png',
  '/icon-wildcard.svg': 'image/svg+xml',
  '/favicon.ico': 'image/x-icon',
};

export default function httpRequestHandler(
  domains: IDomainset,
  onProfileGenerated: (profile: Profile) => void,
) {
  const fullMainSite = cleanDomain(domains.main, domains.port);

  return async function requestHandler(req: IncomingMessage, res: ServerResponse) {
    const userAgent = req.headers['user-agent'];
    if (!userAgent) {
      return messageHeadersReply(res, 400, 'No user agent provided');
    }
    const fullOrigin = `http${domains.isSsl ? 's' : ''}://${fullMainSite}`;
    try {
      const requestUrl = url.parse(req.url);
      const host = req.headers.host;
      if (
        !host.includes(domains.main) &&
        !host.includes(domains.crossSite) &&
        !host.includes(domains.sameSite)
      ) {
        return messageHeadersReply(
          res,
          400,
          'Please visit this site at ' + fullMainSite + ' + vs ' + host,
        );
      }
      if (requestUrl.pathname === '/') {
        return sendStartPage(res, domains);
      }

      // favicon is retrieved before anything is set for cookies or keys. eventually we should capture this too
      if (requestUrl.pathname === '/favicon.ico') {
        res.writeHead(200, {
          'Content-Type': serveFiles[requestUrl.pathname],
        });
        fs.createReadStream(__dirname + '/../public' + requestUrl.pathname).pipe(res, { end: true });
        return;
      }

      const { key, addr, entries } = await processRequest(req, null, domains);

      if (requestUrl.pathname === '/run') {
        res.writeHead(200, {
          'cache-control': 'no-cache, no-store, must-revalidate',
          pragma: 'no-cache',
          expires: 0,
          'content-type': 'text/html',
          'Set-cookie': `key=${key}`,
        });

        res.write(buildIndexHtml(key, addr, userAgent, domains));
        res.end();
      } else if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': fullOrigin,
          'Access-Control-Allow-Methods': 'GET,POST',
          'Access-Control-Allow-Headers': req.headers['access-control-request-headers'],
          'Content-Length': 0,
          Vary: 'Origin',
        });
        res.end('');
      } else if (requestUrl.pathname === '/headers') {
        res.writeHead(200, {
          'content-type': 'text/html',
          'set-cookie': 'key=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT',
        });
        await new Promise(resolve => setTimeout(resolve, 1e3));
        const profile = new Profile(key, entries, domains);
        profile.save();
        onProfileGenerated(profile);
        res.write(buildHeadersHtml(profile.cleanedEntries));
        res.end();
      } else if (requestUrl.pathname === '/isvalid') {
        res.writeHead(200, {
          'content-type': 'application/json',
        });

        const profile = new Profile(key, entries, domains);
        const results = await profile.testHeaders();
        res.write(
          JSON.stringify(
            {
              failed: results.filter(x => !x.passed).length,
              passed: results.filter(x => x.passed).length,
              results,
            },
            null,
            2,
          ),
        );
        res.end();
      } else if (requestUrl.pathname === '/headers.json') {
        res.writeHead(200, {
          'content-type': 'application/json',
        });

        res.write(JSON.stringify(entries));
        res.end();
      } else if (serveFiles[requestUrl.pathname]) {
        res.writeHead(200, {
          'Content-Type': serveFiles[requestUrl.pathname],
        });
        fs.createReadStream(__dirname + '/../public' + requestUrl.pathname).pipe(res, { end: true });
      } else {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': fullOrigin,
          'X-Content-Type-Options': 'nosniff',
          'Content-Type': 'application/json',
        });
        res.write(JSON.stringify({ message: 'hello world' }));
        res.end();
      }
    } catch (err) {
      console.log('Request error %s %s', req.method, req.url, err);
    }
  };
}

function buildIndexHtml(key: string, addr: string, agent: string, domains: IDomainset) {
  const fullSameSite = cleanDomain(domains.sameSite, domains.port);
  const fullCrossSite = cleanDomain(domains.crossSite, domains.port);

  return `<html>
<head>
    <link rel="stylesheet" type="text/css" href="//${fullSameSite}/main.css?hkey=${key}" type="text/css"/>
    <link rel="stylesheet" type="text/css" href="//${fullCrossSite}/main.css?hkey=${key}" type="text/css"/>
    <link rel="stylesheet" type="text/css" href="main.css?hkey=${key}" type="text/css"/>
    <script src="main.js?hkey=${key}" type="application/javascript"></script>
    <script src="//${fullSameSite}/main.js?hkey=${key}" type="application/javascript"></script>
    <script src="//${fullCrossSite}/main.js?hkey=${key}" type="application/javascript"></script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
</head>
<body>
<h1>Http Headers Generator</h1>
<p><b>Address(es):</b> <span id="addresses">${addr}</span></p>
<p><b>Uncleaned User Agent: </b> ${agent}</p>
<br/><br/>
<a href="isvalid?hkey=${key}" target="_blank">Check Results</a>
<br/><br/>
<table>
<thead>
    <th>Type</th>
    <th>Normalized Headers</th>
</thead>
<tbody id="results">

</tbody>
</table>
<img src="icon-wildcard.svg" width="5" />
<img src="//${fullSameSite}/icon-wildcard.svg" width="5" />
<img src="//${fullCrossSite}/icon-wildcard.svg" width="5" />
Ulixee.org
</body>
<script>
  function ws(domain) {
    return new Promise(resolve => {
      const ws = new WebSocket('ws${domains.isSsl ? 's' : ''}://' + domain);
      ws.onerror = function(err) {
        console.log('WebSocket error', err);
        resolve();
      };
      ws.onopen = function() {
        ws.send('sent from ' + location.host + ' with key ${key}', {
          compress:true, binary:false, fin: false, mask: true
        }, function(){});
        resolve();
      };
      ws.onmessage = console.log;
    });
  }
  const urls = ${JSON.stringify(generateXhrTests(key, fullSameSite, fullCrossSite))};
  Promise.all(urls.map(x => {
    const url = x.url === 'host' ? location.host : x.url;
    if (x.func === 'axios.get') return axios.get(url, x.args || {}).catch(console.log);
    else if (x.func === 'ws') return ws(url);
    else fetch(url, x.args || {}).catch(console.log);
  }))
  .then(() => fetch('headers?hkey=${key}')).then(x => x.text())
  .then(body => {
    document.querySelector('tbody').innerHTML = body;
    document.querySelector('tbody').classList.add('loaded')
  })

</script>
</html>`;
}

function sendStartPage(res: ServerResponse, domains: IDomainset) {
  res.writeHead(200, {
    'content-type': 'text/html',
    'cache-control': 'no-cache, no-store, must-revalidate',
    pragma: 'no-cache',
    expires: 0,
  });
  res.end(
    `<html>
<body>
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
<a id="start" href="/run">start</a>
<hr/> 
</div>
</body>
</html>
`,
  );
}

function buildHeadersHtml(entries: ICleanedRequestInfo[]) {
  return entries
    .map(x => {
      return `<tr>
<td>${x.type}<br><div class="small">${x.path}</div></td>
<td><pre>${x.headers.join('\n')}</pre></td>
    </tr>`;
    })
    .join('');
}

function messageHeadersReply(res: ServerResponse, statusCode: number, message: string) {
  res.writeHead(statusCode, {
    'content-type': 'text/html',
  });
  res.write(`<html><body><bold style="color:red">${message}</bold></body></html>`);
  res.end();
}
