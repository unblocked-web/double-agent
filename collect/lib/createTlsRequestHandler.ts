import { URL } from 'url';
import { IncomingMessage, ServerResponse } from 'http';
import IServerContext from '../interfaces/IServerContext';
import extractRequestDetails from "./extractRequestDetails";
import RequestContext from "./RequestContext";
import BaseServer from "../servers/BaseServer";
import { TlsDomain } from "../index";
import {isRecognizedDomain} from "./DomainUtils";

export default function createTlsRequestHandler(server: BaseServer, serverContext: IServerContext) {
  return async function requestHandler(req: IncomingMessage, res: ServerResponse) {
    const { sessionTracker } = serverContext;
    const requestUrl = new URL(`${server.protocol}://${req.headers.host}${req.url}`);

    if (!isRecognizedDomain(req.headers.host, [TlsDomain])) {
      throw new Error('Invalid domain used to access site');
    }

    const session = sessionTracker.getSessionFromServerRequest(server, req);
    const { requestDetails } = await extractRequestDetails(server, req, session);
    const ctx = new RequestContext(server, req, res, requestUrl, requestDetails, session);
    const handler = server.getHandlerFn(requestUrl.pathname);
    session.recordRequest(requestDetails);

    if (handler) {
      await handler(ctx)
    } else {
      res.writeHead(404).end(JSON.stringify({ message: 'Not found' }));
    }
  };
}
