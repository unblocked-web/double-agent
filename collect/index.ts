import 'source-map-support/register';
import { IAssignmentType } from '@double-agent/collect-controller/interfaces/IAssignment';
import SessionTracker from './lib/SessionTracker';
import Session from './lib/Session';

export const MainDomain = process.env.MAIN_DOMAIN ?? 'double-agent.collect';
export const SubDomain = process.env.SUB_DOMAIN ?? 'sub.double-agent.collect';
export const TlsDomain = process.env.TLS_DOMAIN ?? 'tls.double-agent.collect';
export const CrossDomain = process.env.CROSS_DOMAIN ?? 'double-agent-external.collect';

export default class Collect {
  private sessionTracker: SessionTracker = new SessionTracker();

  constructor() {
    if (process.env.GENERATE_PROFILES) {
      console.log('\n\nGenerate Profiles mode activated!');
      return;
    }

    console.log(
      `
NOTE if not using dockers:
1. Go to the collect/certs directory and run generate.sh
2. To run the https tests, you will need to install trusted certificates onto your machine.
   --> On a mac, click on certs/fullchain.pem and add to your System certs and then set Trust to "Secure Sockets Layer" -> Always Trust
   --> On windows... lmgtfy?? sorry..
3. Add the following entries to /etc/hosts if running locally:

127.0.0.1      ${MainDomain}
127.0.0.1      ${SubDomain}
127.0.0.1      ${CrossDomain}
127.0.0.1      ${TlsDomain}
  `,
    );
  }

  public async createSession(
    assignmentType: IAssignmentType,
    userAgentId: string,
    expectedUserAgentString?: string,
  ): Promise<Session> {
    const session = await this.sessionTracker.createSession(assignmentType, userAgentId);
    session.expectedUserAgentString = expectedUserAgentString;

    return session;
  }

  public getSession(sessionId: string): Session {
    return this.sessionTracker.getSession(sessionId);
  }

  public async deleteSession(session: Session) {
    await this.sessionTracker.deleteSession(session.id);
  }
}
