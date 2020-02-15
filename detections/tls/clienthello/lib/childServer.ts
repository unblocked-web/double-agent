import 'source-map-support/register';
import https from 'https';
import tls from 'tls';
import fs from 'fs';
import ja3er from '../ja3er';
import {
  confirmedBrowsers,
  confirmedOperatingSystems,
  findByOs,
  isConfirmedJa3,
} from '../profiles';
import ITlsResult from '../interfaces/ITlsResult';
import { isGreased } from './buildJa3Extended';
import IClientHelloMessage from '../interfaces/IClientHelloMessage';

const messages: IClientHelloMessage[] = [];
process.on('message', m => messages.push(m));

const certPath = process.env.LETSENCRYPT
  ? '/etc/letsencrypt/live/tls.ulixee.org'
  : __dirname + '/../../../../runner/certs';

try {
  const port = process.env.PORT ?? 3007;
  const childServer = https.createServer(
    {
      enableTrace: true,
      sessionTimeout: 10,
      key: fs.readFileSync(certPath + '/privkey.pem'),
      cert: fs.readFileSync(certPath + '/fullchain.pem'),
    },
    async (req, res) => {
      res.connection.setKeepAlive(false);
      console.log(
        'TLS child server request received on port %s. %s from %s:%s',
        port,
        req.url,
        req.connection.remoteAddress,
        req.connection.remotePort,
      );
      // kill socket after response
      if (req.url !== '/') return res.end('Hi');
      try {
        const userAgent = req.headers['user-agent'];
        if (!userAgent) {
          recordResult({
            match: false,
            useragent: null,
            reason: 'No user agent provided',
          });
          res.writeHead(400, {
            'content-type': 'text/html',
          });
          return res.end(
            '<html><body><bold style="color:red">No user agent provided</bold></body></html>',
          );
        }

        const secureSocket = req.connection as tls.TLSSocket;

        await new Promise(resolve => setTimeout(resolve, 500));

        const message = messages.shift();
        messages.length = 0;
        if (!message) {
          recordResult({
            match: false,
            useragent: null,
            reason: 'No tls ClientHello received',
          });
          return res.end('No ClientHello received');
        }

        const ja3erStats = ja3er(message.ja3Details.md5);

        const alsoSeenOn = `TLS fingerprint seen ${ja3erStats.count} times on Ja3er crowdsourced tool, but no confirmations`;
        const alsoSeenOnBrowsers = [...ja3erStats.browsers.entries()].map(
          ([key, val]) => `${key}: ${val.join(', ')}`,
        );

        const isConfirmed = isConfirmedJa3(userAgent, message.ja3Extended);
        const responseMessage: ITlsResult = {
          match: !!isConfirmed,
          useragent: userAgent,
          hasGrease: isGreased(message.ja3Extended.value),
          ja3: message.ja3Details.value,
          ja3Md5: message.ja3Details.md5,
          ja3Extended: message.ja3Extended.value,
          ja3ExtendedMd5: message.ja3Extended.md5,
          ja3erMatchFor: `${alsoSeenOn} (${alsoSeenOnBrowsers.join(', ')})`,
          ja3MatchFor: [],
          clientHello: message.clienthello,
        };

        const osBoxes: string[][] = [];
        for (const os of confirmedOperatingSystems) {
          const arr: string[] = [];
          osBoxes.push(arr);
          for (const browser of confirmedBrowsers) {
            const ja3 = findByOs(os, browser);
            if (ja3) {
              let entry = ja3.ja3ExtendedMd5.substr(0, 10) + '... ';
              if (ja3.ja3ExtendedMd5 === message.ja3Extended.md5) {
                responseMessage.ja3MatchFor.push(
                  `${ja3.userAgent.family} ${ja3.userAgent.major} - ${ja3.userAgent.os.family} ${ja3.userAgent.os.major}.${ja3.userAgent.os.minor}`,
                );
                entry = `<b style="color:green">${entry}</b>`;
              }
              arr.push(entry);
            } else {
              arr.push('-');
            }
          }
        }
        recordResult(responseMessage);
        res.writeHead(200, {
          'content-type': 'text/html',
        });
        res.write(
          `<html>
<head>
<style>
strong {
  display: inline-block;
  width: 250px;
}
ul {
  display: inline-block;
}
th, td {
  border: 1px solid #a4a5a6;
}
table {
margin: 20px 0;
}
</style>
</head>
<body>
    <p><strong>User Agent</strong> ${userAgent}</p>

    <h2>Connection TLS Settings</h2>
    <p><strong>Alpn</strong> ${secureSocket.alpnProtocol}</p>
    <p><strong>Cipher</strong> ${secureSocket.getCipher()?.name ?? 'na'}</p>
    <p><strong>TLS</strong> ${secureSocket.getProtocol()}</p>
    <h2>Client TLS Proposal</h2>
    ${
      isConfirmed
        ? '<h3 style="color:green">Confirmed Browser Signature</h3>'
        : '<h3 style="color:orange">Unknown Browser Signature</h3>'
    }
    <p><strong>Ja3 (Degreased)</strong> ${message.ja3Details.value}</p>
    <p><strong>Ja3 Fingerprint (Degreased)</strong> ${message.ja3Details.md5}</p>
    <p><strong>Ja3 Extended</strong> ${message.ja3Extended.value}</p>
    <p><strong>Ja3 Extended Md5</strong> ${message.ja3Extended.md5}</p>
    <h4>Confirmed Browser Ja3s</h4>
    <table>
      <thead>
            <th>OS</th>
          ${confirmedBrowsers.map(x => `<th>${x}</th>`).join('')}
      </thead>
    <tbody>
      ${confirmedOperatingSystems
        .map(
          (x, i) =>
            `<tr><td>${x.family} ${x.major}.${x.minor}</td>${osBoxes[i]
              .map(y => `<td>${y}</td>`)
              .join('')}</tr>`,
        )
        .join('\n')}
    </tbody>
    </table>

    <p><strong>Crowdsourced Fingerprint Seen</strong> ${ja3erStats.count} on ${
            ja3erStats.browsers.size
          } browsers and ${ja3erStats.operatingSystems.size} OS's</p>
    <p><strong>Browsers</strong></p>
    <ul>${[...ja3erStats.browsers.entries()]
      .map(([key, values]) => {
        return `<li>${key} - ${values
          .map(Number)
          .sort()
          .join(', ')}</li>`;
      })
      .join('\n')}
    </ul>

    <p><strong>Operating Systems</strong></p>
    <ul>${[...ja3erStats.operatingSystems.entries()]
      .map(([key, values]) => {
        return `<li>${key} - ${values.sort().join(', ')}</li>`;
      })
      .join('\n')}
    </ul>
    <h4>TLS ClientHello Message (friendly formatted)</h4>
    <pre>${JSON.stringify(message.clienthello, null, 2)}</pre>
</body>
</html>`,
        );
        res.end();
      } catch (err) {
        console.log('Error servicing request', err);
      }
    },
  );
  childServer.on('error', err => {
    console.log(err);
  });

  childServer.listen(port, () => {
    console.log('TLS -> clienthello started on %s', (childServer.address() as any).port);
    process.send({ serverStarted: true });
  });

  function recordResult(result: ITlsResult) {
    process.send(result);
  }
} catch (err) {
  console.log(err);
}
