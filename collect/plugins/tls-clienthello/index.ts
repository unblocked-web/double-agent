import Plugin from '@double-agent/collect/lib/Plugin';
import IRequestTlsContext from '@double-agent/collect/interfaces/IRequestTlsContext';
import Document from '@double-agent/collect/lib/Document';
import { DomainType } from '@double-agent/collect/lib/DomainUtils';
import TlsServer from '@double-agent/tls-server';
import { IProfileData } from './interfaces/IProfile';

export default class TlsClienthelloPlugin extends Plugin {
  private profileData: IProfileData = {};

  public initialize() {
    this.registerRoute('tls', '/', this.save);
    this.registerRoute('tls', '/ws', this.onWs);
    this.registerPages({ route: this.routes.tls['/'], waitForReady: true });
  }

  public async onWs(ctx: IRequestTlsContext) {
    this.profileData.wssClientHello = ctx.req.clientHello;
    ctx.session.savePluginProfileData<IProfileData>(this, this.profileData);
    ctx.res.end('done');
  }

  public async save(ctx: IRequestTlsContext) {
    this.profileData.clientHello = ctx.req.clientHello;
    ctx.session.savePluginProfileData<IProfileData>(this, this.profileData);

    const document = new Document(ctx);
    const wsUrl = ctx.buildUrl('/ws', DomainType.TlsDomain, 'wss');
    document.injectBodyTag(`
<script type="text/javascript">
  const createWs = new Promise(resolve => {
      return setTimeout(resolve, ${TlsServer.minMillisBetweenConnects} + 500);
  }).then(() => {
      return new Promise(resolve=>{
      const ws = new WebSocket('${wsUrl}');
      ws.onerror = function(err) {
        console.log('WebSocket error', err);
        resolve();
      };
      ws.onopen = function() {
        resolve();
      };
    });
  });
    window.pageQueue.push(createWs);
</script>`);
    ctx.res.end(document.html);
  }
}
