import { DiffGradient } from '@double-agent/analyze/lib/scorers';
import { PositiveMatcher } from '@double-agent/analyze/lib/matchers';
import Plugin, { IResultFlag } from '@double-agent/analyze/lib/Plugin';
import ITlsClienthelloProfile, {
  IProfileData,
} from '@double-agent/collect-tls-clienthello/interfaces/IProfile';
import BaseCheck from '@double-agent/analyze/lib/checks/BaseCheck';
import CheckGenerator from './lib/CheckGenerator';

export default class TlsClienthello extends Plugin {
  private readonly checkPaths: ICheckPath[] = [
    {
      path: 'clientHello',
      layerName: 'Client Hello',
    },
    {
      path: 'wssClientHello',
      layerName: 'Websocket Client Hello',
    },
  ];

  initialize(profiles: ITlsClienthelloProfile[]): void {
    for (const { path, layerName } of this.checkPaths) {
      const checks: BaseCheck[] = [];
      for (const profile of profiles) {
        const checkGenerator = new CheckGenerator(profile, path);
        checks.push(...checkGenerator.checks);
      }

      this.initializeProbes({
        layerKey: 'CLH',
        layerName,
        // description: 'Checks that the browser agent supports the ${title} codecs found in a default installation`',
        checks,
        matcher: PositiveMatcher,
        scorer: DiffGradient,
      });
    }
  }

  runIndividual(profile: any): IResultFlag[] {
    const flags: IResultFlag[] = [];
    for (const check of this.checkPaths) {
      const checkGenerator = new CheckGenerator(profile, check.path);
      const flagged = this.runProbes('CLH', profile.userAgentId, checkGenerator.checks);
      flags.push(...flagged);
    }
    return flags;
  }
}

interface ICheckPath {
  path: keyof IProfileData;
  layerName: string;
}
