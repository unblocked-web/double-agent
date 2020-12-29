import Plugin from '@double-agent/collect/lib/Plugin';
import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import Http2Server from '@double-agent/collect/servers/Http2Server';
import Document from '@double-agent/collect/lib/Document';
import { CrossDomain, MainDomain } from '@double-agent/collect';
import { IProfileData } from './interfaces/IProfile';

export default class Http2SessionPlugin extends Plugin {
  public initialize() {
    this.registerRoute('http2', '/', this.load);
    this.registerRoute('http2', '/wait', this.wait);
    this.registerPages(
      {
        route: this.routes.http2['/wait'],
        domain: MainDomain,
        clickNext: true,
        waitForReady: true,
      },
      {
        route: this.routes.http2['/wait'],
        domain: CrossDomain,
        clickNext: true,
        waitForReady: true,
      },
      {
        route: this.routes.http2['/'],
        domain: MainDomain,
        clickNext: true,
        waitForReady: true,
      },
    );
  }

  public async load(ctx: IRequestContext) {
    this.saveSessions(ctx);

    const document = new Document(ctx);
    document.addNextPageClick();
    ctx.res.end(document.html);
  }

  public async wait(ctx: IRequestContext) {
    this.saveSessions(ctx);

    const document = new Document(ctx);
    document.addNextPageClick();
    // https://github.com/chromium/chromium/blob/99314be8152e688bafbbf9a615536bdbb289ea87/net/spdy/spdy_session.cc#L92
    document.injectBodyTag(`<script type="text/javascript">
         (function() {
           // give 10 seconds for ping to run
        window.pageQueue.push(new Promise(resolve => {
          setTimeout(() => {
            resolve();
          }, 10e3);
        }));
      })();
    </script>`);
    ctx.res.end(document.html);
  }

  private saveSessions(ctx: IRequestContext) {
    const server = ctx.server as Http2Server;
    const profileData = <IProfileData>{
      sessions: server.sessions.map(x => {
        return {
          activity: x.activity,
          id: `${x.session.socket.remoteAddress}:${x.session.socket.remotePort}`,
          origins: x.session.originSet,
        };
      }),
    };
    ctx.session.savePluginProfileData<IProfileData>(this, profileData);
  }
}
