import http from 'http';
import processRequest from './processRequest';
import WebSocket from 'ws';
import IDomainset from '../interfaces/IDomainset';

const wss = new WebSocket.Server({ clientTracking: false, noServer: true });

export default function(domains: IDomainset) {
  return async function upgradeWs(request: http.IncomingMessage, socket, head) {
    await processRequest(request, 'Websocket - Upgrade', domains);

    wss.handleUpgrade(request, socket, head, async function(ws) {
      ws.on('message', function(...message) {
        console.log(`Received websocket message ${message}`);
        ws.send('back at you');
      });
    });
  };
}
