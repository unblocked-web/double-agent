import https from 'https';
import fs from 'fs';
import pcap from 'pcap';

const server = https.createServer(
  { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') },
  (req, res) => {
    res.writeHead(200, {
      'content-type': 'text/html',
    });
    res.write('<html><body>Agent</body></html>');
    res.end();
  },
);

server.on('error', err => {
  console.log(err);
});

server.listen(3007, () => {
  console.log('Started on %s', server.address());
});

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});

try {
  const tcpTracker = new pcap.TCPTracker();
  const pcapSession = new pcap.PcapSession(true, 'eth0', 'ip proto \\tcp and tcp port 443');
  tcpTracker.on('http request', function(session, http) {
    const matches = /send_file\?id=(\d+)/.exec(http.request.url);
    if (matches && matches[1]) {
      session.track_id = matches[1];
      console.log('Added tracking for ' + matches[1]);
    } else {
      console.log("Didn't add tracking for " + http.request.url);
    }
  });
  tcpTracker.on('session', function(session) {
    console.log('Start of session between ' + session.src_name + ' and ' + session.dst_name);

    session.on('end', function(session) {
      console.log('End of TCP session between ' + session.src_name + ' and ' + session.dst_name);
    });
  });

  pcapSession.on('packet', function(raw_packet) {
    const packet = pcap.decode.packet(raw_packet);
    const ethPayload = packet.payload;
    const tcpPayload = ethPayload.payload;
    const payload = tcpPayload.data as Buffer;
    if (payload[0] === 22) {
      // this is a tls handshake
      const sslVersion = getSslVersion(payload[1] * 256 + payload[2]);
      console.log('Got tls handshake %s', sslVersion);
    }
    tcpTracker.track_packet(packet);
  });
} catch (err) {
  console.log(err);
}

function getSslVersion(protoVersion) {
  switch (protoVersion) {
    case 0x002:
      return 'SSLv2';
    case 0x300:
      return 'SSLv3';
    case 0x301:
      return 'TLSv1';
    case 0x302:
      return 'TLSv1.1';
    case 0x303:
      return 'TLSv1.2';
  }
}
