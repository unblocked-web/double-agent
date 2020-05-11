import * as http from 'http';
import { createReadStream, existsSync } from 'fs';

http
  .createServer((req, res) => {
    const filePath = `${__dirname}/../${req.url}`;
    if (!existsSync(filePath)) {
      return res.writeHead(404, 'Not found').end();
    }

    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    }
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'OPTIONS') {
      return res.end();
    }
    return createReadStream(filePath, { autoClose: true }).pipe(res);
  })
  .listen(2000);
