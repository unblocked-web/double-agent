import { EmulatorPlugin, EmulatorPluginStatics, UserAgents } from 'secret-agent/emulators';
import IUserAgent from 'secret-agent/emulators/interfaces/IUserAgent';
import IHttpRequestModifierDelegate from 'secret-agent/shared/commons/interfaces/IHttpRequestModifierDelegate';
import IPageOverride from 'secret-agent/emulators/interfaces/IPageOverride';
import { lookup } from 'useragent';

export default function createEmulatorForAgent(useragent: string) {
  const agent = findUserAgentProfile(useragent);

  @EmulatorPluginStatics
  class GenericEmulator extends EmulatorPlugin {
    public static key = useragent;
    public static browser = '';
    public static chromiumEngines = [80];
    public delegate: IHttpRequestModifierDelegate = {};
    public static userAgent: IUserAgent;

    constructor() {
      super(agent);
    }

    async generatePageOverrides(): Promise<IPageOverride[]> {
      return [];
    }
  }
  return GenericEmulator;
}

function findUserAgentProfile(useragent: string) {
  const userAgent = lookup(useragent);
  const matchingProfile = UserAgents.findOne({
    deviceCategory: 'desktop',
    family: userAgent.family,
    versionMajor: Number(userAgent.major),
  });
  if (matchingProfile) return matchingProfile;

  return UserAgents.convertAgent(userAgent, {
    deviceCategory: 'desktop',
    userAgent: useragent,
    platform:
      userAgent.os.family === 'Windows'
        ? 'Win32'
        : userAgent.os.family === 'Linux'
        ? 'Linux x86_64'
        : 'MacIntel',
    vendor: 'Google Inc.',
  });
}
