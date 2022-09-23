import Plugin, { IPluginPage } from '@double-agent/collect/lib/Plugin';
import IRequestContext from '@double-agent/collect/interfaces/IRequestContext';
import Document from '@double-agent/collect/lib/Document';
import { IProfileData } from './interfaces/IProfile';
import uaPageScript from './uaPageScript';

export default class HttpUaHintsPlugin extends Plugin {
  public static uaHintOptions = [
    'device-memory',
    'downlink',
    'dpr',
    'ect',
    'rtt',
    'save-data',
    'sec-ch-bitness',
    'sec-ch-device-memory',
    'sec-ch-dpr',
    'sec-ch-forced-colors',
    'sec-ch-prefers-color-scheme',
    'sec-ch-prefers-contrast',
    'sec-ch-prefers-reduced-data',
    'sec-ch-prefers-reduced-motion',
    'sec-ch-ua',
    'sec-ch-ua-arch',
    'sec-ch-ua-bitness',
    'sec-ch-ua-full-version',
    'sec-ch-ua-full-version-list',
    'sec-ch-ua-mobile',
    'sec-ch-ua-model',
    'sec-ch-ua-platform',
    'sec-ch-ua-platform-version',
    'sec-ch-ua-wow64',
    'sec-ch-viewport-height',
    'sec-ch-viewport-width',
    'viewport-width',
  ];

  public initialize(): void {
    const pages: IPluginPage[] = [];
    for (const protocol of ['https', 'http2']) {
      this.registerRoute(protocol as any, '/', this.loadScript);
      this.registerRoute(protocol as any, '/save', this.save);
      pages.push({ route: this.routes[protocol]['/'], waitForReady: true });
    }
    this.registerPages(...pages);
  }

  private loadScript(ctx: IRequestContext): void {
    const document = new Document(ctx);
    ctx.res.setHeader('Accept-CH', HttpUaHintsPlugin.uaHintOptions.join(','));
    ctx.res.setHeader('critical-ch', HttpUaHintsPlugin.uaHintOptions.join(','));
    document.injectBodyTag(uaPageScript(ctx));
    ctx.res.end(document.html);
  }

  private async save(ctx: IRequestContext): Promise<void> {
    const protocol = ctx.server.protocol;
    const profileData = ctx.session.getPluginProfileData<IProfileData>(this, {} as any);
    profileData.jsHighEntropyHints = ctx.requestDetails.bodyJson;

    const rawHeaders: string[][] = [];
    for (let i = 0; i < ctx.req.rawHeaders.length; i += 2) {
      const key = ctx.req.rawHeaders[i];
      const value = ctx.req.rawHeaders[i + 1];
      rawHeaders.push([key, value]);
    }
    profileData[protocol] = rawHeaders;
    ctx.session.savePluginProfileData<IProfileData>(this, profileData, {
      keepInMemory: true,
    });
    ctx.res.end();
  }
}
