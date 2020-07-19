import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import domScript from './domScript';
import IDomProfile from './interfaces/IDomProfile';
import DomProfile from './lib/DomProfile';
import { sendJson } from '@double-agent/runner/lib/httpUtils';
import checkProfile from './checks';

export default class BrowserDomPlugin implements IDetectionPlugin {
  private static pluginName = 'browser/dom';

  public async onRequest(ctx: IRequestContext) {
    if (
      ctx.url.pathname === '/results-page' &&
      ctx.requestDetails.secureDomain === true &&
      !ctx.session.pluginsRun.includes(BrowserDomPlugin.pluginName)
    ) {
      ctx.extraScripts.push(domScript(ctx));
    }
  }

  async handleResponse(ctx: IRequestContext) {
    if (ctx.url.pathname === '/dom') {
      ctx.session.pluginsRun.push(BrowserDomPlugin.pluginName);
      const data = DomProfile.clean(ctx.requestDetails.bodyJson as IDomProfile);

      const agentProfile = {
        ...data,
        useragent: ctx.requestDetails.useragent,
      } as IDomProfile;

      try {
        await checkProfile(ctx, agentProfile);
        await DomProfile.save(ctx.session.useragent, data);
      } catch (err) {
        console.log('ERROR checking dom profile', err);
      }
      sendJson(ctx, { success: true });

      // These are large. Someday we might want to preserve them, but for now, too much to keep around in the session
      delete ctx.requestDetails.bodyJson; // delete to give clear gc signal
      ctx.requestDetails.bodyJson = {
        pruned:
          "This json body was pruned because it's several MB. See BrowserDomPlugin.handleResponse",
      };
      return true;
    }

    return false;
  }
}
