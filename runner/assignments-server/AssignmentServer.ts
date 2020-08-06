import * as Fs from 'fs';
import * as http from 'http';
import { IncomingMessage, Server, ServerResponse } from 'http';
import url, { URL } from 'url';
import DetectionsServer from '../detections-server/DetectionsServer';
import getAllAssignments, { buildAssignment } from '../lib/getAllAssignments';
import IAssignment from '../interfaces/IAssignment';
import BrowsersToTest from '@double-agent/profiler/lib/BrowsersToTest';
import zlib from 'zlib';
import { pathToRegexp } from 'path-to-regexp';

interface IRequestParams {
  scraperName: string;
  assignmentId?: string;
  dataDir?: string;
}

interface IActiveScraper {
  assignments: IAssignment[];
  dataDir?: string;
}

export default class AssignmentServer {
  private browsersToTest = new BrowsersToTest();
  private activeScrapers: { [scraper: string]: IActiveScraper  } = {};
  private readonly detectionsServer: DetectionsServer
  private readonly server: http.Server;
  private readonly endpointsByRoute = {
    '/': this.createBasicAssignment.bind(this),
    '/start': this.startAssignments.bind(this),
    '/finish': this.finishAssignments.bind(this),
    '/start/:assignmentId': this.startAssignment.bind(this),
    '/finish/:assignmentId': this.finishAssignment.bind(this),
  };
  private readonly routeMetaByRegexp: Map<RegExp, any> = new Map();

  constructor(detectionsServer: DetectionsServer) {
    this.detectionsServer = detectionsServer;
    this.server = new Server(this.handleRequest.bind(this));
    Object.keys(this.endpointsByRoute).forEach(route => {
      const keys = [];
      const regexp = pathToRegexp(route, keys);
      this.routeMetaByRegexp.set(regexp, { route, keys });
    })
  }

  public listen(port: number, listeningListener?: () => void) {
    return this.server.listen(port, listeningListener);
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    const requestUrl = url.parse(req.url, true);

    console.log('Assignment %s', `${req.headers.host}${req.url}`);

    let endpoint;
    const params = {};
    for (const [regexp, meta] of this.routeMetaByRegexp.entries()) {
      const matches = requestUrl.pathname.match(regexp);
      if (matches) {
        endpoint = this.endpointsByRoute[meta.route];
        meta.keys.forEach((key, index) => {
          params[key.name] = matches[index+1];
        });
        break;
      }
    }

    if (!endpoint) {
      return sendJson(res, { message: 'Not Found' }, 404);
    }

    const scraperName = req.headers.scraper ?? requestUrl.query.scraper as string;
    const dataDir = req.headers.dataDir ?? requestUrl.query.dataDir;
    Object.assign(params, { scraperName, dataDir }, params);
    if (!scraperName) return sendJson(res, { message: 'Please provide a scraper header or query param' }, 500);

    await endpoint(req, res, params);
  }

  public async createBasicAssignment(_, res: ServerResponse, params: IRequestParams) {
    const { scraperName } = params;
    if (!this.activeScrapers[scraperName]) {
      this.activeScrapers[scraperName] = { assignments: [] };
    }

    const assignment = buildAssignment(0, this.detectionsServer.httpDomains, this.detectionsServer.httpsDomains);
    this.activeScrapers[scraperName].assignments.push(assignment);

    await this.activateAssignmentSession(assignment, 'freeform');
    sendJson(res, { assignment });
  }

  public async startAssignments(_, res: ServerResponse, params: IRequestParams) {
    const { scraperName, dataDir } = params;

    this.activeScrapers[scraperName] = this.activeScrapers[scraperName] || {
      dataDir,
      assignments: (await getAllAssignments(
          this.detectionsServer.httpDomains,
          this.detectionsServer.httpsDomains,
          this.browsersToTest,
      )),
    };

    const assignments = this.activeScrapers[scraperName].assignments.map(assignment => {
      return Object.assign({}, assignment, { pages: undefined });
    });

    sendJson(res, { assignments });
  }

  public async finishAssignments(_, res: ServerResponse, params: IRequestParams) {
    const { scraperName } = params;
    const assignments = this.activeScrapers[scraperName]?.assignments;
    if (!assignments) {
      return sendJson(res, { message: `No assignments were found for ${scraperName}` }, 500);
    }

    const pendingAssignments = assignments.filter(x => !x.isCompleted).map(assignment => {
      return Object.assign({}, assignment, { pages: undefined });
    });

    if (!pendingAssignments.length) {
      delete this.activeScrapers[scraperName];
    }

    sendJson(res, { pendingAssignments });
  }

  public async startAssignment(_, res: ServerResponse, params: IRequestParams) {
    const { scraperName, assignmentId } = params;
    if (!assignmentId) return sendJson(res, { message: 'Please provide a assignmentId header or query param' }, 500);

    const assignments = this.activeScrapers[scraperName]?.assignments;
    const assignment = assignments[assignmentId];
    await this.activateAssignmentSession(assignment, assignment.useragent);
    sendJson(res, { assignment });
  }

  private async finishAssignment(_, res: ServerResponse, params: IRequestParams) {
    const { scraperName, assignmentId } = params;
    const activeScraper: IActiveScraper = this.activeScrapers[scraperName];
    if (!assignmentId) return sendJson(res, { message: 'Please provide a assignmentId header or query param' }, 500);

    const assignment: IAssignment = activeScraper.assignments[assignmentId];
    console.log('Fetching session results for %s, index %s', scraperName, assignmentId);

    if (!assignment || assignment.isCompleted) {
      return sendJson(res, {});
    }

    const session = this.detectionsServer.sessionTracker.getSession(assignment.sessionId);
    if (activeScraper.dataDir) {
      const filePath = `${activeScraper.dataDir}/${assignment.profileDirName}.json.gz`;
      Fs.writeFileSync(filePath, await gzipJson(session.toJSON()));
      console.log(`SAVED ${filePath}`);
    }

    this.detectionsServer.sessionTracker.deleteSession(assignment.sessionId);

    assignment.isCompleted = true;
    sendJson(res, { session });
  }

  private async activateAssignmentSession(assignment: IAssignment, useragent: string) {
    if (assignment.sessionId) return;
    const session = this.detectionsServer.sessionTracker.createSession(useragent, assignment);
    addSessionIdToAssignment(assignment, session.id);
    await this.detectionsServer.pluginDelegate.onNewAssignment(assignment);
  }
}

function sendJson(res: ServerResponse, json: any, status = 200) {
  res.writeHead(status, {
    'content-type': 'application/json',
  });
  res.end(JSON.stringify(json));
}

function addSessionIdToAssignment(assignment: IAssignment, sessionId: string) {
  assignment.sessionId = sessionId;
  for (const page of assignment.pages) {
    page.url = addSessionIdToUrl(page.url, sessionId);
    page.clickDestinationUrl = addSessionIdToUrl(page.clickDestinationUrl, sessionId);
  }
}

function addSessionIdToUrl(url: string, sessionId: string) {
  if (!url) return url;
  const startUrl = new URL(url);
  startUrl.searchParams.set('sessionid', sessionId);
  return startUrl.href;
}

function gzipJson(json: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.from(JSON.stringify(json, null, 2));
    zlib.gzip(buffer, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}
