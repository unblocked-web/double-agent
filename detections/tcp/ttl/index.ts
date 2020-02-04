import http from 'http';
import useragent from 'useragent';
import trackRemoteTcpVars from './trackRemoteTcpVars';

const port = process.env.PORT ?? 3006;
const hops = 20;

const getPacket = trackRemoteTcpVars(port);

const server = http.createServer(async (req, res) => {
  const userAgent = req.headers['user-agent'];
  const addr = req.connection.remoteAddress.split(':').pop() + ':' + req.connection.remotePort;

  const packet = await getPacket(addr);
  if (!userAgent) {
    res.writeHead(400, {
      'content-type': 'text/html',
    });
    res.write('<html><body><bold style="color:red">No user agent provided</bold></body></html>');
    res.end();
  }
  const ua = useragent.lookup(userAgent);

  let windowSizes: number[];
  let ttl: number;
  if (ua.os.family === 'Mac OS X') {
    [ttl, ...windowSizes] = ttlWindowValues['Mac OS X'];
  } else if (ua.os.family === 'Windows' && ua.os.major >= 7) {
    [ttl, ...windowSizes] = ttlWindowValues.Windows;
  } else if (ua.os.family === 'Windows') {
    [ttl, ...windowSizes] = ttlWindowValues.WindowsXp;
  } else {
    [ttl, ...windowSizes] = ttlWindowValues.Linux;
  }

  // allow some leeway for router hops that decrement ttls
  const ttlDiff = ttl - packet.ttl;

  const isConfirmed = ttlDiff >= 0 && ttlDiff < hops && windowSizes.includes(packet.windowSize);

  console.log('Session for %s. Confirmed?: %s', addr, isConfirmed, packet);

  res.writeHead(200, {
    'content-type': 'text/html',
  });
  res.write(`<html><h2>
<h1>Tcp Packet Analysis</h1>
<h2 ${isConfirmed ? `style='color:green'>C` : "style='color:orange'>Unc"}onfirmed</h2>
<h3>Os: ${ua.os.family}</h2>
<p>Ttl: ${packet.ttl}. Expected: ${ttl} within ${hops} hops.</p>
<p>Window Size: ${packet.windowSize}. Expected: ${windowSizes.join(', ')}</p>
</body></html>`);
  res.end();
});

server.listen(port, () => {
  console.log('Started on %s', server.address());
});

const ttlWindowValues = {
  'Mac OS X': [64, 65535],
  Linux: [64, 5840, 29200, 5720],
  WindowsXp: [128, 65535],
  Windows: [128, 8192],
};
