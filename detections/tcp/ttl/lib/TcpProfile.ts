import Useragent, { lookup } from 'useragent';
import ProfilerData from '@double-agent/profiler/data';

const pluginId = 'tcp/tls';

export default class TcpProfile {
  public static allowedHops = 20;
  constructor(readonly useragent: string, readonly ttl: number, readonly windowSize: number) {}

  public async save() {
    if (!process.env.GENERATE_PROFILES) return;

    const data = {
      // store without hops
      ttl: 2 ** Math.ceil(Math.log2(this.ttl)),
      windowSize: this.windowSize,
      useragent: this.useragent,
    };

    await ProfilerData.saveProfile(pluginId, this.useragent, data);
  }

  public static getAllProfiles() {
    const entries: (ITcpProfile & { userAgent: Useragent.Agent })[] = [];
    ProfilerData.getByPluginId(pluginId).forEach(entry => {
      entry.userAgent = lookup(entry.useragent);
      entries.push(entry);
    });
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
