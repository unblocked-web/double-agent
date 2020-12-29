import { URL } from 'url';
import { IAssignmentType } from '@double-agent/runner/interfaces/IAssignment';
import http from 'http';
import * as http2 from 'http2';
import Session from './Session';
import PluginDelegate from './PluginDelegate';
import BaseServer from '../servers/BaseServer';

let sessionIdCounter = 0;

export default class SessionTracker {
  private pluginDelegate: PluginDelegate = new PluginDelegate();
  private sessions: { [sessionId: string]: Session } = {};

  public async createSession(assignmentType: IAssignmentType) {
    const sessionId = String((sessionIdCounter += 1));
    console.log('CREATED SESSION ', sessionId);
    const session = new Session(sessionId, assignmentType, this, this.pluginDelegate);
    await session.startServers();

    this.sessions[sessionId] = session;
    return session;
  }

  public getSession(sessionId: string) {
    return this.sessions[sessionId];
  }

  public getSessionFromServerRequest(
    server: BaseServer,
    req: http.IncomingMessage | http2.Http2ServerRequest,
  ) {
    const requestUrl = server.getRequestUrl(req);
    const sessionId = requestUrl.searchParams.get('sessionId');
    if (!sessionId) throw new Error(`Missing session: ${requestUrl}`);

    return this.sessions[sessionId];
  }

  public async deleteSession(sessionId: string) {
    if (!this.sessions[sessionId]) return;
    await this.sessions[sessionId].close();
    delete this.sessions[sessionId];
  }
}
