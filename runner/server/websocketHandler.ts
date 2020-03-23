import http from 'http';
import WebSocket from 'ws';
import ResourceType from '../interfaces/ResourceType';
import extractRequestDetails from './extractRequestDetails';
import IDomainset from '../interfaces/IDomainset';
import RequestContext from '../lib/RequestContext';
import * as net from 'net';
import IDetectionContext from '../interfaces/IDetectionContext';

export default function(domains: IDomainset, detectionContext: IDetectionContext) {
  const wss = new WebSocket.Server({ clientTracking: false, noServer: true });
  return async function upgradeWs(request: http.IncomingMessage, socket: net.Socket, head) {
    const { pluginDelegate, sessionTracker, bucketTracker, getNow } = detectionContext;

    const { requestDetails, requestUrl } = await extractRequestDetails(
      request,
      domains,
      getNow(),
      ResourceType.WebsocketUpgrade,
    );

    const session = sessionTracker.recordRequest(requestDetails, requestUrl);
    const ctx = new RequestContext(
      request,
      null,
      requestUrl,
      requestDetails,
      session,
      domains,
      bucketTracker,
    );

    bucketTracker.recordRequest(ctx);

    await pluginDelegate.onRequest(ctx);
    await pluginDelegate.afterRequestDetectorsRun(ctx);

    const host = request.headers.host;
    wss.handleUpgrade(request, socket, head, async function(ws) {
      ws.on('message', function(...message) {
        console.log(`Received websocket message ${message} on ${host}`);
        session.requests.push({
          time: getNow(),
          resourceType: ResourceType.WebsocketMessage,
          originType: requestDetails.originType,
          hostDomain: requestDetails.hostDomain,
          secureDomain: requestDetails.secureDomain,
          remoteAddress: requestDetails.remoteAddress,
          referer: requestDetails.referer,
          url: requestDetails.url.replace('http', 'ws'),
          origin: requestDetails.origin,
          bodyJson: message,
          useragent: requestDetails.useragent,
          method: null,
          headers: [],
        });
        pluginDelegate.onWebsocketMessage(message, session);
        ws.send('back at you');
      });
    });
  };
}
