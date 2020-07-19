import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import windowKeysScript from './windowKeysScript';
import WindowKeysProfile from './lib/WindowKeysProfile';
import { sendJson } from '@double-agent/runner/lib/httpUtils';
import checkHttpWindowKeys from './checks/httpWindowKeys';

export default class BrowserDomPlugin implements IDetectionPlugin {
  private static pluginName = 'browser/window-keys';

  public async onRequest(ctx: IRequestContext) {
    if (
      ctx.url.pathname === '/' &&
      ctx.requestDetails.secureDomain === false &&
      !ctx.session.pluginsRun.includes(BrowserDomPlugin.pluginName)
    ) {
      ctx.extraScripts.push(windowKeysScript(ctx));
    }
  }

  async handleResponse(ctx: IRequestContext) {
    if (ctx.url.pathname === '/windowKeys') {
      ctx.session.pluginsRun.push(BrowserDomPlugin.pluginName);
      const data = ctx.requestDetails.bodyJson as { keys: string[] };

      await checkHttpWindowKeys(ctx, data.keys);
      const profile = { httpWindowKeys: data.keys, useragent: ctx.session.useragent };
      await WindowKeysProfile.save(profile.useragent, profile);
      sendJson(ctx, { success: true });
      return true;
    }

    return false;
  }
}
