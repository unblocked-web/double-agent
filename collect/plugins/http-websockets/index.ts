import * as Fs from 'fs';
import Plugin, { IPluginPage } from '@double-agent/collect/lib/Plugin';
import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import Document from '@double-agent/collect/lib/Document';
import { IProfileData } from './interfaces/IProfile';
import websocketsScript from './websocketsScript';

const axiosJs = Fs.readFileSync(require.resolve('axios/dist/axios.min.js'));
const axiosSourceMap = Fs.readFileSync(require.resolve('axios/dist/axios.min.map'));

export default class HttpHeadersPlugin extends Plugin {
  public initialize() {
    this.registerRoute('all', '/', this.start);
    this.registerRoute('ws', '/ws', this.onConnection);

    this.registerAsset('all', '/axios.js', this.axiosJs);
    this.registerAsset('all', '/axios.min.map', this.axiosSourceMap);

    const pages: IPluginPage[] = [];

    ['http', 'https'].forEach(protocol => {
      pages.push({ route: this.routes[protocol]['/'], waitForReady: true });
    });

    this.registerPages(...pages);
  }

  public start(ctx: IRequestContext) {
    const document = new Document(ctx);
    document.injectHeadTag(`<script src="${ctx.buildUrl('/axios.js')}"></script>`);
    document.injectBodyTag(websocketsScript(ctx));
    ctx.res.end(document.html);
  }

  public onConnection(ctx: IRequestContext) {
    saveHeadersToProfile(this, ctx);
  }

  public axiosJs(ctx: IRequestContext) {
    ctx.res.writeHead(200, { 'Content-Type': 'application/javascript' });
    ctx.res.end(axiosJs);
  }

  public axiosSourceMap(ctx: IRequestContext) {
    ctx.res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    ctx.res.end(axiosSourceMap);
  }
}

/////// /////////////////

function saveHeadersToProfile(plugin: Plugin, ctx: IRequestContext) {
  const pathname = ctx.url.pathname;
  const { domainType, originType, method, referer } = ctx.requestDetails;
  const protocol = ctx.server.protocol;
  const pageName = undefined;
  const rawHeaders: string[][] = [];
  for (let i = 0; i < ctx.req.rawHeaders.length; i += 2) {
    const key = ctx.req.rawHeaders[i];
    const value = ctx.req.rawHeaders[i + 1];
    rawHeaders.push([key, value]);
  }

  const profileData = ctx.session.getPluginProfileData<IProfileData>(plugin, []);
  profileData.push({
    pageName,
    method,
    protocol,
    domainType,
    originType,
    pathname,
    referer,
    rawHeaders,
  });
  ctx.session.savePluginProfileData<IProfileData>(plugin, profileData, {
    keepInMemory: true,
  });
}
