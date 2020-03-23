import IDetectionPlugin from '../interfaces/IDetectionPlugin';
import IRequestContext from '../interfaces/IRequestContext';
import IDetectorModule from '../interfaces/IDetectorModule';
import IDetectionDomains from '../interfaces/IDetectionDomains';
import IDirective from '../interfaces/IDirective';
import IDetectionSession from '../interfaces/IDetectionSession';
import UserBucketTracker from '../lib/UserBucketTracker';

export default class DetectorPluginDelegate implements IDetectionPlugin {
  constructor(readonly detectors: IDetectorModule[]) {}

  async onNewDirective(directive: IDirective) {
    for (const detector of this.detectors) {
      if (!detector.plugin || !detector.plugin.onNewDirective) continue;

      await detector.plugin.onNewDirective(directive);
    }
  }

  async start(
    domains: IDetectionDomains,
    secureDomains: IDetectionDomains,
    bucketTracker: UserBucketTracker,
  ) {
    for (const detector of this.detectors) {
      if (!detector.plugin || !detector.plugin.start) continue;

      await detector.plugin.start(domains, secureDomains, bucketTracker);
    }
  }

  async stop() {
    for (const detector of this.detectors) {
      if (!detector.plugin || !detector.plugin.stop) continue;
      await detector.plugin?.stop();
    }
  }

  async handleResponse(ctx: IRequestContext) {
    for (const detector of this.detectors) {
      if (!detector.plugin || !detector.plugin.handleResponse) continue;
      if (await detector.plugin?.handleResponse(ctx)) {
        return true;
      }
    }
    return false;
  }

  onPageLoaded(page: string, ctx: IRequestContext) {
    for (const detector of this.detectors) {
      if (!detector.plugin || !detector.plugin.onPageLoaded) continue;
      detector.plugin?.onPageLoaded(page, ctx);
    }
  }

  async onRequest(ctx: IRequestContext) {
    for (const detector of this.detectors) {
      if (!detector.plugin || !detector.plugin.onRequest) continue;
      await detector.plugin?.onRequest(ctx);
    }
  }

  async afterRequestDetectorsRun(ctx: IRequestContext) {
    for (const detector of this.detectors) {
      if (!detector.plugin || !detector.plugin.afterRequestDetectorsRun) continue;
      await detector.plugin?.afterRequestDetectorsRun(ctx);
    }
  }

  onWebsocketMessage(message: any, session: IDetectionSession) {
    for (const detector of this.detectors) {
      if (!detector.plugin || !detector.plugin.onWebsocketMessage) continue;
      detector.plugin?.onWebsocketMessage(message, session);
    }
  }
}
