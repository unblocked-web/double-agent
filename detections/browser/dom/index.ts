import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import domScript from './domScript';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import { saveUseragentProfile } from '@double-agent/runner/lib/profileHelper';
import IDomProfile from './interfaces/IDomProfile';
import DomProfile from './lib/DomProfile';


export default class BrowserDomPlugin implements IDetectionPlugin {
  private pluginName = 'browser/dom';

  public async onRequest(ctx: IRequestContext) {
    if (
      ctx.requestDetails.resourceType === ResourceType.Document &&
      !ctx.session.pluginsRun.includes(this.pluginName)
    ) {
      ctx.extraScripts.push(domScript(ctx));
    }
  }

  async handleResponse(ctx: IRequestContext) {

    if (ctx.url.pathname === '/dom') {
      const res = ctx.res;
      const data = DomProfile.clean(ctx.requestDetails.bodyJson as IDomProfile);

      const agentProfile = {
        ...data,
        useragent: ctx.requestDetails.useragent,
      } as IDomProfile;

      this.checkProfile(ctx, agentProfile);

      // if (process.env.GENERATE_PROFILES) {
        saveUseragentProfile(agentProfile.useragent, agentProfile, __dirname + '/profiles');
      // }

      if (ctx.req.headers.origin) {
        res.setHeader('Access-Control-Allow-Origin', ctx.req.headers.origin);
      } else if (ctx.req.headers.referer) {
        res.setHeader('Access-Control-Allow-Origin', new URL(ctx.req.headers.referer).origin);
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      });

      res.end(JSON.stringify({ success: true }));
      return true;
    }

    return false;
  }

  private checkProfile(ctx: IRequestContext, profile: IDomProfile) {
    ctx.session.pluginsRun.push(this.pluginName);
  }
}
