import ITcpProfile from '@double-agent/collect/plugins/tcp/interfaces/IProfile';
import Config from '@double-agent/config';
import ExpectedValueCheck from './checks/ExpectedValueCheck';
import ExpectedValuesCheck from './checks/ExpectedValuesCheck';

export default class CheckGenerator {
  public readonly ttlChecks = [];
  public readonly winChecks = [];

  private readonly profile: ITcpProfile;

  constructor(profile: ITcpProfile) {
    this.profile = profile;
    this.extractTtlChecks();
    this.extractWindowSizeChecks();
  }

  private extractTtlChecks() {
    const { useragentId } = this.profile;
    const { osName } = Config.extractMetaFromUseragentId(useragentId);
    const expectedValue = expectedTtlValues[osName];

    const check = new ExpectedValueCheck(
      { useragentId },
      'time-to-live',
      expectedValue,
      this.profile.data.ttl,
    );
    this.ttlChecks.push(check);
  }

  private extractWindowSizeChecks() {
    const { useragentId } = this.profile;
    const { osName, osVersion } = Config.extractMetaFromUseragentId(useragentId);

    let expectedValues = expectedWindowSizes[osName];

    if (osName === 'windows') {
      const windowsVersion = Number(osVersion.split('-', 1)) >= 10 ? '10' : '7';
      expectedValues = expectedWindowSizes[osName][windowsVersion];
    }
    if (!expectedValues) {
      console.log('WARN: No expected window sizes found', useragentId);
    }

    const check = new ExpectedValuesCheck(
      { useragentId },
      'window-sizes',
      expectedValues,
      this.profile.data.windowSize,
    );
    this.winChecks.push(check);
  }
}

const expectedTtlValues = {
  'mac-os-x': 64,
  linux: 64,
  windows: 128,
};

const expectedWindowSizes = {
  'mac-os': [65535],
  linux: [5840, 29200, 5720],
  windows: {
    7: [8192],
    10: [64240, 65535],
  },
};
