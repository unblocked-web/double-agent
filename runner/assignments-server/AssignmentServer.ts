import * as http from 'http';
import { IncomingMessage, Server, ServerResponse } from 'http';
import url, {URL} from 'url';
import DetectionsServer from '../detections-server/DetectionsServer';
import getAllAssignments, {buildAssignment} from '../lib/getAllAssignments';
import IAssignment from '../interfaces/IAssignment';
import BrowsersToTest from '@double-agent/profiler/lib/BrowsersToTest';

interface IRequestParams {
  scraper: string;
  assignmentId?: string;
}

export default class AssignmentServer {
  private readonly detectionsServer: DetectionsServer
  private readonly server: http.Server;
  private readonly routes = {
    '/': this.listAssignments.bind(this),
    '/start': this.startAssignment.bind(this),
    '/finish': this.finishAssignment.bind(this),
    '/create': this.createAssignment.bind(this),
  };

  public browsersToTest = new BrowsersToTest();
  public scraperAssignments: { [scraper: string]: IAssignment[] } = {};

  constructor(detectionsServer: DetectionsServer) {
    this.detectionsServer = detectionsServer;
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

    const scraper = req.headers.scraper ?? requestUrl.query.scraper as string;
    const assignmentId = req.headers.assignmentId ?? requestUrl.query.assignmentId;

    if (!scraper) return sendJson(res, { message: 'Please provide a scraper header or query param' }, 500);

    await this.routes[requestUrl.pathname](req, res, { scraper, assignmentId });
  }

  public async listAssignments(_, res: ServerResponse, params: IRequestParams) {
    const { scraper } = params;
    this.scraperAssignments[scraper] = this.scraperAssignments[scraper] || await getAllAssignments(
      this.detectionsServer.httpDomains,
      this.detectionsServer.httpsDomains,
      this.browsersToTest,
    );

    const assignments = this.scraperAssignments[scraper].map((assignment, index) => {
      const { useragent, percentOfTraffic, profileDirName, testType, sessionid, isCompleted } = assignment;
      return { id: index, useragent, percentOfTraffic, profileDirName, testType, sessionid, isCompleted };
    });

    sendJson(res, assignments);
  }

  public async startAssignment(_, res: ServerResponse, params: IRequestParams) {
    const { scraper, assignmentId } = params;
    if (!assignmentId) return sendJson(res, { message: 'Please provide a assignmentId header or query param' }, 500);

    this.scraperAssignments[scraper] = this.scraperAssignments[scraper] || await getAllAssignments(
        this.detectionsServer.httpDomains,
        this.detectionsServer.httpsDomains,
        this.browsersToTest,
    );

    const assignments = this.scraperAssignments[scraper];
    const assignment = assignments[assignmentId];
    await this.activateAssignment(assignment, assignment.useragent);
    sendJson(res, assignment);
  }

  public async createAssignment(_, res: ServerResponse, params: IRequestParams) {
    const { scraper } = params;
    if (!this.scraperAssignments[scraper]) {
      this.scraperAssignments[scraper] = [];
    }

    const assignment = buildAssignment(this.detectionsServer.httpDomains, this.detectionsServer.httpsDomains);
    this.scraperAssignments[scraper].push(assignment);

    await this.activateAssignment(assignment, 'freeform');
    sendJson(res, assignment);
  }

  private async finishAssignment(_, res: ServerResponse, params: IRequestParams) {
    const { scraper, assignmentId } = params;
    if (!assignmentId) return sendJson(res, { message: 'Please provide a assignmentId header or query param' }, 500);
    const assignments = this.scraperAssignments[scraper] || [];
    const assignment: IAssignment = assignments[assignmentId];
    console.log('Fetching session results for %s, index %s', scraper, assignmentId);

    if (!assignment || assignment.isCompleted) {
      return sendJson(res, {});
    }

    const session = this.detectionsServer.sessionTracker.getSession(assignment.sessionid);
    this.detectionsServer.sessionTracker.deleteSession(assignment.sessionid);

    assignment.isCompleted = true;
    sendJson(res, { session });
  }

  private async activateAssignment(assignment: IAssignment, useragent: string) {
    if (assignment.sessionid) return;

    const session = this.detectionsServer.sessionTracker.createSession(useragent);
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

function addSessionIdToAssignment(assignment: IAssignment, sessionid: string) {
  assignment.sessionid = sessionid;
  for (const page of assignment.pages) {
    page.url = addSessionIdToUrl(page.url, sessionid);
    page.clickDestinationUrl = addSessionIdToUrl(page.clickDestinationUrl, sessionid);
  }
}

function addSessionIdToUrl(url: string, sessionid: string) {
  if (!url) return url;
  const startUrl = new URL(url);
  startUrl.searchParams.set('sessionid', sessionid);
  return startUrl.href;
}

