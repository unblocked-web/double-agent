import 'source-map-support/register';
import https from 'https';
import tls from 'tls';
import fs from 'fs';
import ja3er from '../ja3er';
import ITlsResult from '../interfaces/ITlsResult';
import { isGreased } from './buildJa3Extended';
import IClientHelloMessage from '../interfaces/IClientHelloMessage';
import { dirname } from 'path';
import resultPage from './resultPage';
import * as http from 'http';
import url from 'url';
import ClientHelloProfile from './ClientHelloProfile';

const messages: IClientHelloMessage[] = [];
process.on('message', m => messages.push(m));

const certPath = process.env.LETSENCRYPT
  ? '/etc/letsencrypt/live/tls.ulixee.org'
  : dirname(require.resolve('@double-agent/runner')) + '/certs';

try {
  const port = process.env.PORT ?? 3007;
  const redirectHref = process.env.REDIRECT_HREF ?? '';
  const childServer = https.createServer(
    {
      enableTrace: true,
      sessionTimeout: 10,
      key: fs.readFileSync(certPath + '/privkey.pem'),
      cert: fs.readFileSync(certPath + '/fullchain.pem'),
    },
    async (req, res) => {
      res.connection.setKeepAlive(false);
      const requestUrl = url.parse(req.url, true);
      console.log(
        'TLS child server request received on port %s. %s: %s from %s:%s',
        port,
        req.method,
        requestUrl.href,
        req.connection.remoteAddress,
        req.connection.remotePort,
        req.headers['user-agent'],
      );
      // kill socket after response
      if (requestUrl.pathname !== '/') return res.end('Hi');
      try {
        const secureSocket = req.connection as tls.TLSSocket;

        await new Promise(resolve => setTimeout(resolve, 500));

        let errorMessage = '';
        const userAgent = req.headers['user-agent'];
        const message = messages.shift();
        messages.length = 0;

        if (!userAgent) {
          errorMessage = 'No user agent provided';
        }
        if (!message) {
          errorMessage = 'No tls ClientHello received';
        }
        if (errorMessage) {
          recordResult({
            match: false,
            useragent: null,
            reason: errorMessage,
          });

          return sendHtmlMessage(res, errorMessage, 400);
        }

        const ja3erStats = ja3er(message.ja3Details.md5);

        const alsoSeenOn = `TLS fingerprint seen ${ja3erStats.count} times on Ja3er crowdsourced tool, but no confirmations`;
        const alsoSeenOnBrowsers = [...ja3erStats.browsers.entries()].map(
          ([key, val]) => `${key}: ${val.join(', ')}`,
        );

        const isConfirmed = ClientHelloProfile.isConfirmedJa3(userAgent, message.ja3Extended);
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

        recordResult(responseMessage);

        sendHtml(res, resultPage(redirectHref, responseMessage, message, secureSocket, ja3erStats));
      } catch (err) {
        console.log('Error servicing request', err);
      }
    },
  );
  childServer.on('error', err => {
    console.log(err);
  });

  childServer.listen(port, () => {
    console.log(
      'TLS -> clienthello child server started on %s',
      (childServer.address() as any).port,
    );
    process.send({ serverStarted: true });
  });

  function sendHtmlMessage(res: http.ServerResponse, message: string, code: number = 200) {
    console.log('ERROR loading tls clienthello', message);
    return sendHtml(
      res,
      `<html lang="en"><body><bold style="color:red">message</bold></body></html>`,
      code,
    );
  }

  function sendHtml(res: http.ServerResponse, html: string, code: number = 200) {

    res.writeHead(code, {
      'content-type': 'text/html',
    });
    res.end(html);
  }

  function recordResult(result: ITlsResult) {
    process.send(result);
  }
} catch (err) {
  console.log(err);
}
