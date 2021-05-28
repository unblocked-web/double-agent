import { IncomingMessage, ServerResponse } from 'http';
import http2 from 'http2';
import * as fs from 'fs';
import { createUserAgentIdFromString } from '@double-agent/config';
import IRequestContext from '../interfaces/IRequestContext';
import extractRequestDetails from './extractRequestDetails';
import RequestContext from './RequestContext';
import IServerContext from '../interfaces/IServerContext';
import BaseServer from '../servers/BaseServer';
import { CrossDomain, MainDomain, SubDomain } from '../index';
import { isRecognizedDomain } from './DomainUtils';

export default function createHttpRequestHandler(
  server: BaseServer,
  serverContext: IServerContext,
) {
  return async function requestHandler(
    req: IncomingMessage | http2.Http2ServerRequest,
    res: ServerResponse | http2.Http2ServerResponse,
  ) {
    if (req.method === 'HEAD') {
      // BrowserStack sends head requests to check if a domain is active. not part of the tests..
      console.log('HEAD request inbound. Should not be getting this.', req.url, req.headers);
      return res.end();
    }

    const { sessionTracker } = serverContext;
    const requestUrl = server.getRequestUrl(req);
    const route = server.getRoute(requestUrl.pathname);

    if (!isRecognizedDomain(requestUrl.host, [MainDomain, SubDomain, CrossDomain])) {
      throw new Error('Invalid domain used to access site');
    }

    if (requestUrl.pathname === '/favicon.ico') {
      return sendFavicon(res);
    }
    if (route?.isAsset) {
      await route?.handlerFn({ res } as IRequestContext);
      return;
    }

    try {
      const sessionId = sessionTracker.getSessionIdFromServerRequest(server, req);
      const session = sessionTracker.getSession(sessionId);
      if (!session) {
        throw new Error(`Missing session: ${sessionId}`);
      }
      const { requestDetails } = await extractRequestDetails(server, req, session);
      const ctx = new RequestContext(server, req, res, requestUrl, requestDetails, session);
      const userAgentId = createUserAgentIdFromString(req.headers['user-agent']);
      session.recordRequest(requestDetails);

      console.log(userAgentId, req.headers['user-agent']);
      console.log(
        '%s %s: from %s (%s)',
        requestDetails.method,
        requestDetails.url,
        requestDetails.remoteAddress,
        userAgentId,
      );

      if (req.method === 'OPTIONS') {
        sendPreflight(ctx);
        if (route?.preflightHandlerFn) await route?.preflightHandlerFn(ctx);
      } else if (route?.handlerFn) {
        await route?.handlerFn(ctx);
      } else {
        res.writeHead(404).end(JSON.stringify({ message: 'Not found' }));
      }
    } catch (err) {
      console.log('Request error %s %s', req.method, req.url, err);
      res.writeHead(500, err.message).end();
    }
  };
}

function sendPreflight(ctx: IRequestContext) {
  let origin = ctx.req.headers.origin;
  // set explicit domain to deal with strict origin
  if (origin === 'null') {
    origin = `http${ctx.requestDetails.secureDomain ? 's' : ''}://${ctx.req.headers.host}`;
  }
  ctx.res.writeHead(204, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST',
    'Access-Control-Allow-Headers': ctx.req.headers['access-control-request-headers'] ?? '',
    'Content-Length': 0,
    Vary: 'Origin',
  });
  ctx.res.end('');
}

function sendFavicon(res: ServerResponse | http2.Http2ServerResponse) {
  const asset = fs.readFileSync(`${__dirname}/../public/favicon.ico`);
  res.writeHead(200, { 'Content-Type': 'image/x-icon' });
  res.end(asset);
}
