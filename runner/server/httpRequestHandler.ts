import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import runPage from '../views/runPage';
import { URL } from 'url';
import startPage from '../views/startPage';
import IDetectionPlugin from '../interfaces/IDetectionPlugin';
import IRequestContext from '../interfaces/IRequestContext';
import HostDomain from '../interfaces/HostDomain';
import resultsPage from '../views/resultsPage';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import extractRequestDetails from './extractRequestDetails';
import { getUseragentPath } from '../lib/profileHelper';
import getBotScoring from '../lib/getBotScoring';
import IDomainset from '../interfaces/IDomainset';
import RequestContext from '../lib/RequestContext';
import IDetectionContext from '../interfaces/IDetectionContext';

export default function httpRequestHandler(
  domains: IDomainset,
  detectionContext: IDetectionContext,
) {
  return async function requestHandler(req: IncomingMessage, res: ServerResponse) {
    // browserstack sends head requests to check if a domain is active. not part of the tests..
    if (req.method === 'HEAD') {
      console.log('HEAD request inbound. Should not be getting this.', req.url, req.headers);
      return res.end();
    }

    const listeningDomains = domains.listeningDomains;

    const requestUrl = new URL(`${listeningDomains.main.protocol}//${req.headers.host}${req.url}`);

    if (!isOndomains(requestUrl, listeningDomains)) {
      return sendMessageReply(
        res,
        400,
        'Please visit this site at ' + listeningDomains.main.href + ' + vs ' + requestUrl.host,
      );
    }

    const { bucketTracker, pluginDelegate, sessionTracker } = detectionContext;
    try {
      const { requestDetails, accessControlHeader } = await extractRequestDetails(
        req,
        domains,
        detectionContext.getNow(),
      );

      const session = sessionTracker.recordRequest(requestDetails, requestUrl, accessControlHeader);
      const ctx = new RequestContext(
        req,
        res,
        requestUrl,
        requestDetails,
        session,
        domains,
        bucketTracker,
      );

      bucketTracker.recordRequest(ctx);

      await pluginDelegate.onRequest(ctx);
      await pluginDelegate.afterRequestDetectorsRun(ctx);

      const botScore = getBotScoring(ctx);

      console.log(
        '%s %s: from %s (%s) %s',
        requestDetails.method,
        requestDetails.url,
        requestDetails.remoteAddress,
        getUseragentPath(req.headers['user-agent']),
        ...botScore,
      );

      if (requestDetails.setCookies.length) {
        ctx.res.setHeader('Set-Cookie', requestDetails.setCookies);
      }

      const flow = urlFlow[requestUrl.pathname];
      if (flow) {
        flow(ctx, pluginDelegate);
      } else if (req.method === 'OPTIONS') {
        preflight(ctx);
      } else if (requestUrl.pathname === '/axios.js') {
        sendAxios(ctx);
      } else if (requestUrl.pathname === '/axios.min.map') {
        sendAxiosMap(ctx);
      } else if (serveFiles[requestUrl.pathname]) {
        sendAsset(ctx);
      } else if (await pluginDelegate.handleResponse(ctx)) {
        // handled
      } else {
        res.writeHead(404).end(JSON.stringify({ message: 'Not found' }));
      }
    } catch (err) {
      console.log('Request error %s %s', req.method, req.url, err);
      res.writeHead(500, err.message).end();
    }
  };
}

const urlFlow = {
  '/': ctx => sendPage(ctx, startPage),
  '/run': ctx => sendRedirect(ctx, HostDomain.Sub, '/run-redirect'),
  '/run-redirect': ctx => sendRedirect(ctx, HostDomain.External, '/run-page'),
  '/run-page': ctx => sendPage(ctx, runPage),
  '/results': ctx => sendRedirect(ctx, HostDomain.Sub, '/results-redirect'),
  '/results-redirect': ctx => sendRedirect(ctx, HostDomain.Main, '/results-page'),
  '/results-page': ctx => sendPage(ctx, resultsPage),
  '/page-loaded': (ctx, pluginDelegate) => onPageload(ctx, pluginDelegate),
};

const serveFiles = {
  '/main.js': 'application/javascript',
  '/main.css': 'text/css',
  '/result.css': 'text/css',
  '/world.png': 'image/png',
  '/icon-wildcard.svg': 'image/svg+xml',
  '/favicon.ico': 'image/x-icon',
};

function isOndomains(requestUrl: URL, listeningDomains: IDetectionDomains) {
  return (
    requestUrl.host === listeningDomains.main.host ||
    requestUrl.host === listeningDomains.external.host ||
    requestUrl.host === listeningDomains.subdomain.host
  );
}

function onPageload(ctx: IRequestContext, pluginDelegate: IDetectionPlugin) {
  const page = ctx.url.searchParams.get('page') as string;
  pluginDelegate.onPageLoaded(page, ctx);
  return sendMessageReply(ctx.res, 200, 'Ok');
}

function sendPage(ctx: IRequestContext, render: (ctx: IRequestContext) => string) {
  ctx.res.writeHead(200, {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: 0,
    'Content-Type': 'text/html',
  });

  const html = render(ctx);
  ctx.res.end(html);
}

function sendRedirect(ctx: IRequestContext, origin: HostDomain, location: string) {
  ctx.res.writeHead(302, {
    location: `${ctx.trackUrl(location, origin)}`,
  });
  ctx.res.end();
}

function preflight(ctx: IRequestContext) {
  ctx.res.writeHead(204, {
    'Access-Control-Allow-Origin': ctx.req.headers.origin,
    'Access-Control-Allow-Methods': 'GET,POST',
    'Access-Control-Allow-Headers': ctx.req.headers['access-control-request-headers'] ?? '',
    'Content-Length': 0,
    Vary: 'Origin',
  });
  ctx.res.end('');
}

function sendAsset(ctx: IRequestContext) {
  let pathname = ctx.url.pathname;
  if (pathname === '/result.css') pathname = '/main.css';
  ctx.res.writeHead(200, {
    'Content-Type': serveFiles[pathname],
  });
  fs.createReadStream(__dirname + '/../public' + pathname).pipe(ctx.res, {
    end: true,
  });
}

function sendAxios(ctx: IRequestContext) {
  ctx.res.writeHead(200, {
    'Content-Type': 'application/javascript',
  });
  fs.createReadStream(require.resolve('axios/dist/axios.min.js')).pipe(ctx.res, {
    end: true,
  });
}

function sendAxiosMap(ctx: IRequestContext) {
  ctx.res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
  });
  fs.createReadStream(require.resolve('axios/dist/axios.min.map')).pipe(ctx.res, {
    end: true,
  });
}

function sendMessageReply(res: ServerResponse, statusCode: number, message: string) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html',
  });
  res.end(`<html><body><bold style="color:red">${message}</bold></body></html>`);
}
