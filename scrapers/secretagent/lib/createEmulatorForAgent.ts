import { EmulatorPlugin, EmulatorPluginStatics, UserAgents } from '@secret-agent/emulators';
import IHttpRequestModifierDelegate from '@secret-agent/commons/interfaces/IHttpRequestModifierDelegate';
import IPageOverride from '@secret-agent/emulators/interfaces/IPageOverride';
import { lookup } from 'useragent';
import tcpVars from '@secret-agent/emulator-plugins-shared/tcpVars';

export default function createEmulatorForAgent(useragent: string) {
  const agentProfile = buildUserAgentProfile(useragent);

  @EmulatorPluginStatics
  class GenericEmulator extends EmulatorPlugin {
    public static emulatorId = useragent;
    public static browser = '';
    public static chromiumEngines = [80];
    public delegate: IHttpRequestModifierDelegate;
    public readonly userAgent = agentProfile;

    constructor() {
      super();
      this.delegate = {
        tcpVars: tcpVars(this.userAgent.os),
      };
    }

    async generatePageOverrides(): Promise<IPageOverride[]> {
      return [];
    }
  }
  return GenericEmulator;
}

export function buildUserAgentProfile(useragent: string) {
  const userAgent = lookup(useragent);
  const matchingProfile = UserAgents.findOne({
    deviceCategory: 'desktop',
    family: userAgent.family,
    versionMajor: Number(userAgent.major),
    operatingSystems: [
      {
        versionMinor: userAgent.os.minor,
        versionMajor: userAgent.os.major,
        family: userAgent.os.family as any,
      },
    ],
  });
  if (matchingProfile) return matchingProfile;

  return UserAgents.convertAgent(userAgent, {
    deviceCategory: 'desktop',
    userAgent: useragent,
    // linux seems to use win32 too
    platform: userAgent.os.family === 'Mac OS X' ? 'MacIntel' : 'Win32',
    vendor: 'Google Inc.',
  });
}
