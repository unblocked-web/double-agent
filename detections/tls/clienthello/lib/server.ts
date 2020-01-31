import https from 'https';
import tls from 'tls';
import fs from 'fs';
import { IClientHello } from './parseHelloMessage';
import { IJa3, IJa3Package } from './buildJa3';
import readJa3s from '../ja3er/readJa3s';
import useragent from 'useragent';
import browserJa3s from '../profiles/clienthello.json';

const messages: { clienthello: IClientHello; ja3: IJa3Package; ja3Extended: IJa3 }[] = [];
process.on('message', m => messages.push(m));

const certPath = process.env.LETSENCRYPT ? '/etc/letsencrypt/live/tls.ulixee.org' : './certs';
const stats = readJa3s();

const confirmedJa3s = browserJa3s.map(x => {
  return {
    userAgent: useragent.lookup(x.userAgent),
    ja3: x.ja3,
    ja3Extended: x.ja3Extended,
    raw: x.raw,
  };
});

const server = https.createServer(
  {
    enableTrace: true,
    sessionTimeout: 10,
    key: fs.readFileSync(certPath + '/privkey.pem'),
    cert: fs.readFileSync(certPath + '/fullchain.pem'),
  },
  async (req, res) => {
    console.log('Inbound request received', req.url, req.connection.remoteAddress);
    if (req.url !== '/') return res.end('Hi');
    try {
      const userAgent = req.headers['user-agent'];
      if (!userAgent) {
        res.writeHead(400, {
          'content-type': 'text/html',
        });
        res.write(
          '<html><body><bold style="color:red">No user agent provided</bold></body></html>',
        );
        res.end();
      }

      const secureSocket = req.connection as tls.TLSSocket;

      await new Promise(resolve => setTimeout(resolve, 500));

      const message = messages.shift();
      messages.length = 0;
      if (!message) {
        return res.end('No ClientHello received');
      }

      const jaStats = stats[message.ja3.ja3.md5] ?? { count: 0, userAgents: [] };
      const operatingSystems = new Map<string, string[]>();
      const browsers = new Map<string, string[]>();
      for (const agent of jaStats.userAgents) {
        if (agent.os === 'Other') continue;
        const os = operatingSystems.get(agent.os) ?? [];
        if (!os.includes(agent.osv)) os.push(agent.osv);
        operatingSystems.set(agent.os, os);
        const br = browsers.get(agent.browser) ?? [];
        if (!br.includes(agent.browserv)) br.push(agent.browserv);
        browsers.set(agent.browser, br);
      }

      const parsedUa = useragent.lookup(userAgent);

      const isConfirmed = confirmedJa3s.find(
        x =>
          x.ja3Extended === message.ja3Extended.md5 &&
          parsedUa.family === x.userAgent.family &&
          parsedUa.major === x.userAgent.major &&
          parsedUa.os.family === x.userAgent.os.family &&
          parsedUa.os.major === x.userAgent.os.major &&
          parsedUa.os.minor === x.userAgent.os.minor,
      );
      const confirmedBrowsers = confirmedJa3s
        .map(x => x.userAgent.family + ' ' + x.userAgent.major)
        .reduce((list, entry) => {
          if (!list.includes(entry)) list.push(entry);
          return list;
        }, [])
        .sort();
      const confirmedOperatingSystems = confirmedJa3s
        .map(x => x.userAgent.os)
        .reduce((list, entry) => {
          if (
            !list.some(
              x => x.family === entry.family && x.major === entry.major && x.minor === entry.minor,
            )
          ) {
            list.push(entry);
          }
          return list;
        }, [])
        .sort((a, b) => {
          if (a.family !== b.family) {
            return a.family.localeCompare(b.family);
          }
          const majorDiff = b.major - a.major;
          if (majorDiff !== 0) return majorDiff;
          return b.minor - a.minor;
        });
      const osBoxes: string[][] = [];
      for (const os of confirmedOperatingSystems) {
        const arr: string[] = [];
        osBoxes.push(arr);
        for (const browser of confirmedBrowsers) {
          const ja3 = confirmedJa3s.find(
            x =>
              x.userAgent.os.family === os.family &&
              x.userAgent.os.major === os.major &&
              x.userAgent.os.minor === os.minor &&
              x.userAgent.family + ' ' + x.userAgent.major === browser,
          );
          if (ja3) {
            let entry = ja3.ja3Extended.substr(0, 10) + '... ';
            if (ja3.ja3Extended === message.ja3Extended.md5) {
              entry = `<b style="color:green">${entry}</b>`;
            }
            arr.push(entry);
          } else {
            arr.push('-');
          }
        }
      }
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
    
    <h2>Connection Tls Settings</h2>
    <p><strong>Alpn</strong> ${secureSocket.alpnProtocol}</p>
    <p><strong>Cipher</strong> ${secureSocket.getCipher()?.name ?? 'na'}</p>
    <p><strong>Tls</strong> ${secureSocket.getProtocol()}</p>
    <h2>Client Tls Proposal</h2>
    ${
      isConfirmed
        ? '<h3 style="color:green">Confirmed Browser Signature</h3>'
        : '<h3 style="color:orange">Unknown Browser Signature</h3>'
    }
    <p><strong>Ja3 (Degreased)</strong> ${message.ja3.ja3.value}</p>
    <p><strong>Ja3 Fingerprint (Degreased)</strong> ${message.ja3.ja3.md5}</p>
    <p><strong>Ja3 Extended</strong> ${message.ja3Extended.value}</p>
    <p><strong>Ja3 Extended Md5</strong> ${message.ja3Extended.md5}</p>
    <h5>Confirmed Browser Ja3s</h5>
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
  
    <textarea cols="150" rows="7">${JSON.stringify(
      {
        userAgent,
        ja3: message.ja3.ja3.md5,
        ja3Extended: message.ja3Extended.md5,
        raw: message.ja3Extended.value,
      },
      null,
      2,
    )}</textarea>
    <p><strong>Crowdsourced Fingerprint Seen</strong> ${jaStats.count} on ${
          browsers.size
        } browsers and ${operatingSystems.size} OS's</p>
    <p><strong>Browsers</strong></p>
    <ul>${[...browsers.entries()]
      .map(([key, values]) => {
        return `<li>${key} - ${values
          .map(Number)
          .sort()
          .join(', ')}</li>`;
      })
      .join('\n')}
    </ul>

    <p><strong>Operating Systems</strong></p>
    <ul>${[...operatingSystems.entries()]
      .map(([key, values]) => {
        return `<li>${key} - ${values.sort().join(', ')}</li>`;
      })
      .join('\n')}
    </ul>
    <h4>Tls ClientHello Message (friendly formatted)</h4>
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

server.on('error', err => {
  console.log(err);
});

server.listen(process.env.PORT ?? 3007, () => {
  console.log('Started on %s', (server.address() as any).port);
});
