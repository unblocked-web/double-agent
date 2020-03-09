import * as tls from 'tls';
import ITlsResult from '../interfaces/ITlsResult';
import IClientHelloMessage from '../interfaces/IClientHelloMessage';
import ClientHelloProfile from './ClientHelloProfile';

export default function resultPage(
  redirectHref: string,
  result: ITlsResult,
  clientHelloMessage: IClientHelloMessage,
  secureSocket: tls.TLSSocket,
  ja3erStats,
) {
  const osBoxes: string[][] = [];
  for (const os of ClientHelloProfile.confirmedOperatingSystems) {
    const arr: string[] = [];
    osBoxes.push(arr);
    for (const browser of ClientHelloProfile.confirmedBrowsers) {
      const ja3 = ClientHelloProfile.findByOs(os, browser);
      if (ja3) {
        let entry = ja3.ja3ExtendedMd5.substr(0, 10) + '... ';
        if (ja3.ja3ExtendedMd5 === clientHelloMessage.ja3Extended.md5) {
          result.ja3MatchFor.push(
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
  return `
<html lang="en">
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
<title>Tls Settings</title>
</head>
<body id="results">
    <p><strong>User Agent</strong> ${result.useragent}</p>

    <h2>Connection TLS Settings</h2>
    <p><strong>Alpn</strong> ${secureSocket.alpnProtocol}</p>
    <p><strong>Cipher</strong> ${secureSocket.getCipher()?.name}</p>
    <p><strong>TLS</strong> ${secureSocket.getProtocol()}</p>
    ${redirectHref ? `<p><strong>Next</strong></p> <a href="${redirectHref}" id="goto-start-page">Next</a>` : ''}
    
    <h2>Client TLS Proposal</h2>
${
  result.match
    ? '<h3 style="color:green">Confirmed Browser Signature</h3>'
    : '<h3 style="color:orange">Unknown Browser Signature</h3>'
}
    <p><strong>Ja3 (Degreased)</strong> ${clientHelloMessage.ja3Details.value}</p>
    <p><strong>Ja3 Fingerprint (Degreased)</strong> ${clientHelloMessage.ja3Details.md5}</p>
    <p><strong>Ja3 Extended</strong> ${clientHelloMessage.ja3Extended.value}</p>
    <p><strong>Ja3 Extended Md5</strong> ${clientHelloMessage.ja3Extended.md5}</p>
    <h4>Confirmed Browser Ja3s</h4>
    <table>
      <thead>
            <th>OS</th>
          ${ClientHelloProfile.confirmedBrowsers.map(x => `<th>${x}</th>`).join('')}
      </thead>
    <tbody>
      ${ClientHelloProfile.confirmedOperatingSystems
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
    <pre>${JSON.stringify(clientHelloMessage.clienthello, null, 2)}</pre>
</body>
</html>`;
}
