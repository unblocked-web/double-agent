import IDetectionPlugin from '@double-agent/runner/interfaces/IDetectionPlugin';
import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import IpProfile from './lib/IpProfile';

export default class IpAddressPlugin implements IDetectionPlugin {
  public async onRequest(ctx: IRequestContext) {
    if (ctx.session.requests.length == 1) {
      ctx.session.identifiers.push({
        layer: 'ip',
        name: 'IP Address',
        id: ctx.requestDetails.remoteAddress.split(':').shift(),
        raw: null,
      });
      ctx.session.identifiers.push({
        layer: 'ip',
        name: 'IP Port',
        id: ctx.requestDetails.remoteAddress.split(':').pop(),
        raw: null,
      });
      ctx.session.pluginsRun.push(`ip/address`);
    }

    const ips = new Set<string>();
    for (const request of ctx.session.requests) {
      ips.add(request.remoteAddress.split(':').shift());
    }
    if (ips.size > 1) {
      ctx.session.flaggedChecks.push({
        value: `${ips.size} IPs`,
        expected: '1 IP',
        category: 'IP Address',
        checkName: 'Same IP for all Requests',
        description: 'Checks that all requests for a session come from the same IP',
        layer: 'ip',
        pctBot: 100,
        secureDomain: ctx.requestDetails.secureDomain,
        resourceType: ctx.requestDetails.resourceType,
        originType: ctx.requestDetails.originType,
        hostDomain: ctx.requestDetails.hostDomain,
        requestIdx: ctx.session.requests.indexOf(ctx.requestDetails),
      });
    }

    if (ctx.url.pathname === '/results-page' && ctx.requestDetails.secureDomain === false) {
      const profile = IpProfile.fromContext(ctx);
      profile.save();
    }
  }
}
