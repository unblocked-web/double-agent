import url from 'url';
import archiver from 'archiver';
import * as Fs from 'fs';
import * as Path from 'path';
import * as http from 'http';
import { pathToRegexp } from 'path-to-regexp';
import Collect from '@double-agent/collect';
import Plugin from '@double-agent/collect/lib/Plugin';
import IAssignment, { AssignmentType } from '../interfaces/IAssignment';
import buildAssignment from './buildAssignment';
import buildAllAssignments from './buildAllAssignments';

interface IRequestParams {
  scraperName: string;
  assignmentId?: string;
  dataDir?: string;
}

interface IAssignmentsById {
  [id: string]: IAssignment;
}

interface IActiveScraper {
  name: string;
  assignmentsById: IAssignmentsById;
  dataDir?: string;
  isBasic?: boolean;
}

const DOWNLOAD = 'download';
const downloadDir = '/tmp/double-agent-download-data';
if (Fs.existsSync(downloadDir)) Fs.rmdirSync(downloadDir, { recursive: true });

export default class Server {
  private activeScrapers: { [scraper: string]: IActiveScraper } = {};
  private readonly collect: Collect;
  private readonly httpServer: http.Server;
  private readonly httpServerPort: number;
  private readonly routeMetaByRegexp: Map<RegExp, any> = new Map();

  private readonly endpointsByRoute = {
    '/': this.createBasicAssignment.bind(this),
    '/create': this.createAssignments.bind(this),
    '/activate/:assignmentId': this.activateAssignment.bind(this),
    '/download': this.downloadAll.bind(this),
    '/download/:assignmentId': this.downloadAssignmentProfiles.bind(this),
    '/finish': this.finishAssignments.bind(this),
    '/user-agent': this.extractNavigatorDetails.bind(this),
    '/favicon.ico': this.sendFavicon.bind(this),
  };

  constructor(collect: Collect, httpServerPort: number) {
    this.collect = collect;
    this.httpServerPort = httpServerPort;
    this.httpServer = new http.Server(this.handleRequest.bind(this));

    Object.keys(this.endpointsByRoute).forEach(route => {
      const keys = [];
      const regexp = pathToRegexp(route, keys);
      this.routeMetaByRegexp.set(regexp, { route, keys });
    });
  }

  public start() {
    return new Promise(resolve => {
      this.httpServer.listen(this.httpServerPort, resolve).on('error', err => console.log(err));
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const requestUrl = url.parse(req.url, true);

    console.log('Assignment %s', `${req.headers.host}${req.url}`);

    let endpoint;
    const params = {};
    for (const [regexp, meta] of this.routeMetaByRegexp.entries()) {
      const matches = requestUrl.pathname.match(regexp);
      if (matches) {
        endpoint = this.endpointsByRoute[meta.route];
        meta.keys.forEach((key, index) => {
          params[key.name] = matches[index + 1];
        });
        break;
      }
    }

    if (!endpoint) {
      return sendJson(res, { message: 'Not Found' }, 404);
    }

    const scraperName = req.headers.scraper ?? (requestUrl.query.scraper as string);
    const dataDir = req.headers.dataDir ?? requestUrl.query.dataDir;
    Object.assign(params, { scraperName, dataDir }, params);

    await endpoint(req, res, params);
  }

  private async extractNavigatorDetails(req: http.IncomingMessage, res: http.ServerResponse) {
    const userAgentString = req.headers['user-agent'];
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <div id="userAgent">${userAgentString}</div>
      <div id="platform"></div>
      <div id="buildID"></div>
      <script>
      document.querySelector('#platform').innerText = window.navigator.platform;
      document.querySelector('#buildID').innerText = window.navigator.buildID;
      </script>
    `);
  }

  private async sendFavicon(_, res: http.ServerResponse) {
    const asset = Fs.readFileSync(`${__dirname}/../public/favicon.ico`);
    res.writeHead(200, { 'Content-Type': 'image/x-icon' });
    res.end(asset);
  }

  private async createBasicAssignment(_, res: http.ServerResponse, params: IRequestParams) {
    const { scraperName, dataDir } = params;
    if (!scraperName)
      return sendJson(res, { message: 'Please provide a scraper header or query param' }, 500);

    if (!this.activeScrapers[scraperName]) {
      this.activeScrapers[scraperName] = {
        name: scraperName,
        dataDir: dataDir || DOWNLOAD,
        assignmentsById: {},
        isBasic: true,
      };
    }

    const activeScraper = this.activeScrapers[scraperName];

    for (const assignmentId of Object.keys(activeScraper.assignmentsById)) {
      const assignment = activeScraper.assignmentsById[assignmentId];
      const session = this.collect.getSession(assignment.sessionId);
      await this.collect.deleteSession(session);
      delete activeScraper.assignmentsById[assignmentId];
    }

    const assignment = buildAssignment(scraperName);
    activeScraper.assignmentsById = { [assignment.id]: assignment };

    params.assignmentId = assignment.id.toString();
    await this.activateAssignment(_, res, params);
  }

  private async createAssignments(_, res: http.ServerResponse, params: IRequestParams) {
    const { scraperName, dataDir } = params;
    if (!scraperName)
      return sendJson(res, { message: 'Please provide a scraper header or query param' }, 500);

    this.activeScrapers[scraperName] =
      this.activeScrapers[scraperName] || (await this.createScraper(scraperName, dataDir));

    const assignments = Object.values(this.activeScrapers[scraperName].assignmentsById).map(
      assignment => {
        return { ...assignment, pagesByPlugin: undefined };
      },
    );

    sendJson(res, { assignments });
  }

  private async createScraper(name: string, dataDir: string) {
    const assignments = await buildAllAssignments();
    const assignmentsById: IAssignmentsById = {};

    for (const assignment of assignments) {
      assignmentsById[assignment.id] = assignment;
    }

    return {
      name,
      dataDir: dataDir || DOWNLOAD,
      assignmentsById,
    };
  }

  private async activateAssignment(_, res: http.ServerResponse, params: IRequestParams) {
    const { scraperName, assignmentId } = params;
    if (!scraperName)
      return sendJson(res, { message: 'Please provide a scraper header or query param' }, 500);
    if (!assignmentId)
      return sendJson(res, { message: 'Please provide a assignmentId header or query param' }, 500);

    const activeScraper = this.activeScrapers[scraperName];
    const assignmentsById = activeScraper?.assignmentsById;
    const assignment = assignmentsById ? assignmentsById[assignmentId] : null;
    if (!assignment) return sendJson(res, { message: 'Assignment not found' }, 500);

    if (assignment.sessionId) return;
    const session = await this.collect.createSession(assignment.type, assignment.userAgentString);
    assignment.sessionId = session.id;
    assignment.pagesByPlugin = session.generatePages();

    if (activeScraper.dataDir) {
      session.onSavePluginProfile = (plugin: Plugin, data: any, filenameSuffix: string) => {
        const profilesDir = extractAssignmentProfilesDir(activeScraper, assignment);
        const filename = `${plugin.id}${filenameSuffix ? `-${filenameSuffix}` : ''}`;
        this.saveFile(profilesDir, `${filename}.json`, data);
      };
    }

    const dataDir = extractAssignmentDir(activeScraper, assignment);
    sendJson(res, { assignment: { dataDir, ...assignment } });
  }

  private async downloadAssignmentProfiles(_, res: http.ServerResponse, params: IRequestParams) {
    const { scraperName, assignmentId } = params;
    if (!scraperName)
      return sendJson(res, { message: 'Please provide a scraperName header or query param' }, 500);
    if (!assignmentId)
      return sendJson(res, { message: 'Please provide a assignmentId header or query param' }, 500);

    const activeScraper = this.activeScrapers[scraperName];
    const assignmentsById = activeScraper?.assignmentsById;
    const assignment = assignmentsById ? assignmentsById[assignmentId] : null;
    if (!assignment) return sendJson(res, { message: 'Assignment not found' }, 500);

    this.saveMetaFiles(activeScraper, assignment);
    const profilesDir = extractAssignmentProfilesDir(activeScraper, assignment);
    pipeDirToStream(profilesDir, res);
  }

  private async downloadAll(_, res: http.ServerResponse, params: IRequestParams) {
    const { scraperName } = params;
    if (!scraperName)
      return sendJson(res, { message: 'Please provide a scraperName header or query param' }, 500);

    const activeScraper = this.activeScrapers[scraperName];
    for (const assignmentId of Object.keys(activeScraper.assignmentsById)) {
      const assignment = activeScraper.assignmentsById[assignmentId];
      this.saveMetaFiles(activeScraper, assignment);
    }

    const profilesDir = extractBaseDir(activeScraper);
    pipeDirToStream(profilesDir, res);
  }

  private async finishAssignments(_, res: http.ServerResponse, params: IRequestParams) {
    const { scraperName } = params;
    if (!scraperName)
      return sendJson(res, { message: 'Please provide a scraper header or query param' }, 500);

    const activeScraper = this.activeScrapers[scraperName];
    const assignments = activeScraper ? Object.values(activeScraper.assignmentsById) : [];
    if (!activeScraper) {
      return sendJson(res, { message: `No assignments were found for ${scraperName}` }, 500);
    }

    for (const assignment of assignments) {
      const session = this.collect.getSession(assignment.sessionId);
      this.saveMetaFiles(activeScraper, assignment);
      await this.collect.deleteSession(session);
    }
    delete this.activeScrapers[scraperName];

    if (activeScraper.dataDir === DOWNLOAD) {
      const dataDir = extractBaseDir(activeScraper);
      Fs.rmdirSync(dataDir, { recursive: true });
    }

    sendJson(res, { finished: true });
  }

  private saveMetaFiles(activeScraper: IActiveScraper, assignment: IAssignment) {
    const baseDirPath = extractAssignmentDir(activeScraper, assignment);
    this.saveFile(baseDirPath, 'assignment.json', assignment);

    // ToDo: We need to save session.json but without the DOM export (and other unneeded data) -- too large
    // this.saveFile(baseDirPath, 'session.json', session.toJSON());
  }

  private saveFile(dirPath: string, fileName: string, data: any) {
    const prevUmask = process.umask();
    process.umask(0);
    if (!Fs.existsSync(dirPath)) {
      Fs.mkdirSync(dirPath, { recursive: true, mode: 0o775 });
    }
    Fs.writeFileSync(`${dirPath}/${fileName}`, JSON.stringify(data, null, 2));
    console.log(`SAVED ${dirPath}/${fileName}`);
    process.umask(prevUmask);
  }
}

function sendJson(res: http.ServerResponse, json: any, status = 200) {
  res.writeHead(status, {
    'content-type': 'application/json',
  });
  res.end(JSON.stringify(json));
}

function extractBaseDir(activeScraper: IActiveScraper) {
  if (activeScraper.dataDir === DOWNLOAD) {
    return Path.join(downloadDir, activeScraper.name);
  }
  return activeScraper.dataDir;
}

function extractAssignmentDir(activeScraper: IActiveScraper, assignment: IAssignment) {
  const baseDir = extractBaseDir(activeScraper);
  const isIndividual = assignment.type === AssignmentType.Individual;
  const folder = (isIndividual
    ? assignment.type
    : `${assignment.type}-${assignment.pickType}`
  ).toLowerCase();
  return `${baseDir}/${folder}/${assignment.id}`;
}

function extractAssignmentProfilesDir(activeScraper: IActiveScraper, assignment: IAssignment) {
  const baseDirPath = extractAssignmentDir(activeScraper, assignment);
  return `${baseDirPath}/raw-data`;
}

function pipeDirToStream(dirPath: string, stream: any) {
  const archive = archiver('zip', { gzip: true, zlib: { level: 9 } });
  const fileNames = Fs.readdirSync(dirPath);
  for (const fileName of fileNames) {
    const filePath = `${dirPath}/${fileName}`;
    archive.append(Fs.createReadStream(filePath), { name: fileName });
  }
  archive.pipe(stream);
  archive.finalize();
}
