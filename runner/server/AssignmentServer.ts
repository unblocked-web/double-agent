import * as http from 'http';
import { IncomingMessage, Server, ServerResponse } from 'http';
import url from 'url';
import DetectionsServer from './DetectionsServer';

export default class AssignmentServer {
  private readonly server: http.Server;
  private readonly routes = {
    '/': this.nextAssignment.bind(this),
    '/create': this.createAssignment.bind(this),
    '/results': this.getResults.bind(this),
  };

  constructor(readonly detectionsServer: DetectionsServer) {
    this.server = new Server(this.handleRequest.bind(this));
  }

  public listen(port: number, listeningListener?: () => void) {
    return this.server.listen(port, listeningListener);
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    const requestUrl = url.parse(req.url, true);

    if (!this.routes[requestUrl.pathname]) {
      return res.writeHead(200).end();
    }

    console.log('Assignments %s', req.url);
    const scraperDir = req.headers.scraper ?? requestUrl.query.scraper;
    if (!scraperDir) {
      return sendJson(res, { message: 'Please provide a scraper header or query param' }, 500);
    }
    await this.routes[requestUrl.pathname](req, res, scraperDir as string);
  }

  private async getResults(_, res: ServerResponse, scraperDir: string) {
    const result = await this.detectionsServer.saveScraperResults(
      scraperDir,
      `${__dirname}/../../scrapers/${scraperDir}`,
    );
    console.log(
      '\n\n--------------------  Results Complete for "%s"  -------------------\n\n',
      scraperDir,
    );
    sendJson(res, { result });
  }

  private async nextAssignment(_, res: ServerResponse, scraperDir: string) {
    const assignment = await this.detectionsServer.nextAssignment(scraperDir);
    sendJson(res, { assignment });
  }

  private async createAssignment(_, res: ServerResponse, scraperName: string) {
    const assignment = await this.detectionsServer.createSessionAssignments(scraperName);
    sendJson(res, { assignment });
  }
}

function sendJson(res: ServerResponse, json: any, status = 200) {
  res.writeHead(status, {
    'content-type': 'application/json',
  });
  res.end(JSON.stringify(json));
}
