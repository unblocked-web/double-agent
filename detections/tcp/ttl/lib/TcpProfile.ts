import fs from 'fs';
import { saveUseragentProfile } from '@double-agent/runner/lib/useragentProfileHelper';
import Useragent, { lookup } from 'useragent';

const profilesDir = process.env.PROFILES_DIR ?? `${__dirname}/../profiles`;

export default class TcpProfile {
  public static allowedHops = 20;
  constructor(readonly useragent: string, readonly ttl: number, readonly windowSize: number) {}

  public save() {
    if (!process.env.GENERATE_PROFILES) return;

    const data = {
      // store without hops
      ttl: 2 ** Math.ceil(Math.log2(this.ttl)),
      windowSize: this.windowSize,
      useragent: this.useragent,
    };

    saveUseragentProfile(this.useragent, data, profilesDir);
  }

  public test() {
    const ua = lookup(this.useragent);
    let expectedOsWindowSizes = expectedWindowSizes[ua.os.family];
    if (ua.os.family === 'Windows') {
      expectedOsWindowSizes = expectedWindowSizes[Number(ua.os.major) >= 10 ? 'Windows10' : 'Windows7'];
    }
    const expectedOsTtl = expectedTtlValues[ua.os.family];
    // allow some leeway for router hops that decrement ttls
    const ttlDiff = expectedOsTtl - this.ttl;

    return [
      {
        success: ttlDiff < TcpProfile.allowedHops && ttlDiff >= 0,
        category: 'TCP Layer',
        name: 'Packet TTL',
        value: this.ttl,
        expected: expectedOsTtl,
        useragent: this.useragent,
      },
      {
        success: expectedOsWindowSizes.includes(this.windowSize),
        category: 'TCP Layer',
        name: 'Packet WindowSize',
        value: this.windowSize,
        expected: expectedOsWindowSizes.join(','),
        useragent: this.useragent,
      },
    ];
  }

  public static findUniqueProfiles(): ITcpGrouping[] {
    const profiles = this.getAllProfiles();
    const groupings: { [key: string]: ITcpGrouping } = {};
    for (const profile of profiles) {
      const key = `${profile.windowSize}_${profile.ttl}`;
      if (!groupings[key])
        groupings[key] = { useragents: [], ttl: profile.ttl, windowSize: profile.windowSize };

      groupings[key].useragents.push(profile.useragent);
    }
    return Object.values(groupings);
  }

  public static getAllProfiles() {
    const entries: (ITcpProfile & { userAgent: Useragent.Agent })[] = [];
    for (const filepath of fs.readdirSync(profilesDir)) {
      if (!filepath.endsWith('json') || filepath.startsWith('_')) continue;
      const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
      const json = JSON.parse(file) as ITcpProfile & { userAgent: Useragent.Agent };
      json.userAgent = lookup(json.useragent);
      entries.push(json);
    }
    return entries;
  }
}

interface ITcpProfile {
  ttl: number;
  windowSize: number;
  useragent: string;
}

interface ITcpGrouping {
  useragents: string[];
  ttl: number;
  windowSize: number;
}

const expectedTtlValues = {
  'Mac OS X': 64,
  Linux: 64,
  Windows: 128,
};

const expectedWindowSizes = {
  'Mac OS X': [65535],
  Linux: [5840, 29200, 5720],
  Windows7: [8192],
  Windows10: [64240, 65535],
};
