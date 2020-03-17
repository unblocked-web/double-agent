import http from 'http';
import WebSocket from 'ws';
import ResourceType from '../interfaces/ResourceType';
import SessionTracker from '../lib/SessionTracker';
import DetectorPluginDelegate from './DetectorPluginDelegate';
import extractRequestDetails from './extractRequestDetails';
import IDomainset from '../interfaces/IDomainset';
import moment from 'moment';

export default function(
  pluginDelegate: DetectorPluginDelegate,
  domains: IDomainset,
  sessionTracker: SessionTracker,
  getNow: () => moment.Moment,
) {
  const wss = new WebSocket.Server({ clientTracking: false, noServer: true });
  return async function upgradeWs(request: http.IncomingMessage, socket, head) {
    const { requestDetails, requestUrl } = await extractRequestDetails(
      request,
      domains,
      getNow(),
      ResourceType.WebsocketUpgrade,
    );
    const session = sessionTracker.recordRequest(requestDetails, requestUrl);

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
