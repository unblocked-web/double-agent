import http from 'http';
import WebSocket from 'ws';
import * as net from 'net';
import { createUseragentId } from '@double-agent/config';
import ResourceType from '../interfaces/ResourceType';
import extractRequestDetails from './extractRequestDetails';
import RequestContext from "./RequestContext";
import IServerContext from '../interfaces/IServerContext';
import BaseServer from "../servers/BaseServer";

export default function createWebsocketHandler(server: BaseServer, detectionContext: IServerContext) {
  const wss = new WebSocket.Server({ clientTracking: false, noServer: true });

  return async function websocketHandler(req: http.IncomingMessage, socket: net.Socket, head) {
    const { sessionTracker } = detectionContext;
    const session = sessionTracker.getSessionFromServerRequest(server, req);
    const { requestDetails, requestUrl } = await extractRequestDetails(server, req, session, ResourceType.WebsocketUpgrade);
    const ctx = new RequestContext(server, req, null, requestUrl, requestDetails, session);
    const useragentId = createUseragentId(req.headers['user-agent']);
    session.recordRequest(requestDetails);

    console.log(
      '%s %s: from %s (%s)',
      'WS',
      requestDetails.url,
      requestDetails.remoteAddress,
      useragentId,
    );

    const handlerFn = server.getHandlerFn(requestUrl.pathname);

    wss.handleUpgrade(req, socket, head, async (ws) => {
      if (handlerFn) {
        await handlerFn(ctx);
      }
      ws.on('message', async (message: WebSocket.Data) => {
        console.log(`WS: Received message ${message} on ${req.headers.host}`);
        ws.send('back at you');
      });
    });
  };
}
