import fs from 'fs';
import { IRequestInfo } from './processRequest';
import { json } from '../../../../../ulixee/shared/types';
import IDomainset, { cleanDomain } from '../interfaces/IDomainset';
import getBrowserProfileStats from './getBrowserProfileStats';
import testProfile from './testProfile';
import { getUseragentPath, saveUseragentProfile } from '@double-agent/runner/lib/useragentProfileHelper';

const profilesDir = process.env.PROFILES_DIR ?? `${__dirname}/../profiles`;
const httpsProfilesDir = `${profilesDir}/https`;
const httpProfilesDir = `${profilesDir}/http`;

if (!fs.existsSync(httpsProfilesDir)) fs.mkdirSync(httpsProfilesDir);
if (!fs.existsSync(httpProfilesDir)) fs.mkdirSync(httpProfilesDir);

export default class Profile {
  public readonly cleanedEntries: ICleanedRequestInfo[];
  public readonly agentGrouping: string;
  public readonly userAgent: string;

  public get browserAndVersion() {
    return this.agentGrouping.split('__').pop();
  }

  constructor(
    readonly key: string,
    readonly entries: IRequestInfo[],
    readonly domains: IDomainset,
  ) {
    const rootEntry = this.entries.find(x => x.url.endsWith('/run'));
    this.userAgent = rootEntry.userAgent;
    this.agentGrouping = getUseragentPath(rootEntry.userAgent);
    this.cleanedEntries = this.parseEntries();
  }

  public save() {
    if (!process.env.GENERATE_PROFILES) return;
    const profilesDir = this.domains.isSsl ? httpsProfilesDir : httpProfilesDir;

    const data = {
      requests: this.entries,
      domains: this.domains,
      key: this.key,
    } as IProfile;

    saveUseragentProfile(this.userAgent, data, profilesDir);
  }

  public testHeaders() {
    const analysis = getBrowserProfileStats(this.domains.isSsl);
    const browserVersion = this.browserAndVersion;
    const browserStats = analysis.statsByBrowserVersion[browserVersion];

    return testProfile(this, browserStats ?? {});
  }

  public static getAllProfiles(type: 'http' | 'https') {
    const profilesDir = type === 'https' ? httpsProfilesDir : httpProfilesDir;
    const entries: Profile[] = [];
    for (const filepath of fs.readdirSync(profilesDir)) {
      if (!filepath.endsWith('json')) continue;
      const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
      const json = JSON.parse(file) as IProfile;
      entries.push(new Profile(json.key, json.requests, json.domains));
    }
    return entries;
  }

  private parseEntries(): ICleanedRequestInfo[] {
    const { sameSite, crossSite, main, port } = this.domains;
    const fullMainSite = cleanDomain(main, port);
    const fullSameSite = cleanDomain(sameSite, port);
    const fullCrossSite = cleanDomain(crossSite, port);

    return this.entries
      .sort((a, b) => {
        if (a.url.endsWith('/run') && !b.url.endsWith('/run')) return -1;
        if (b.url.endsWith('/run') && !a.url.endsWith('/run')) return 1;
        if (a.url.includes(sameSite) && !b.url.endsWith(sameSite)) return 1;
        if (b.url.includes(sameSite) && !a.url.endsWith(sameSite)) return -1;
        if (a.url.includes(crossSite) && !b.url.endsWith(crossSite)) return 1;
        if (b.url.includes(crossSite) && !a.url.endsWith(crossSite)) return -1;
        if (a.url.includes(sameSite) && b.url.includes(crossSite)) return -1;
        if (b.url.includes(sameSite) && a.url.includes(crossSite)) return 1;
        if (a.url === b.url) {
          return a.method.localeCompare(b.method);
        }
        return a.url.localeCompare(b.url);
      })
      .map(x => ({
        path: `${x.method}:${x.url}`
          .replace(fullSameSite, 'sameSite')
          .replace(fullMainSite, 'mainSite')
          .replace(fullCrossSite, 'crossSite')
          .replace(sameSite, 'sameSite')
          .replace(main, 'mainSite')
          .replace(crossSite, 'crossSite')
          .replace(`key=${this.key}`, 'key=1'),
        headers: x.headers.map(x =>
          x
            .replace(RegExp(fullSameSite, 'g'), 'sameSite')
            .replace(RegExp(fullMainSite, 'g'), 'mainSite')
            .replace(RegExp(fullCrossSite, 'g'), 'crossSite')
            .replace(RegExp(sameSite, 'g'), 'sameSite')
            .replace(RegExp(main, 'g'), 'mainSite')
            .replace(RegExp(crossSite, 'g'), 'crossSite')
            .replace(RegExp(`key=${this.key}`, 'g'), 'key=1'),
        ),
        rawHeaders: x.headers,
        sameAgent: x.userAgent === this.userAgent,
        type: x.type,
      }));
  }
}

export interface IProfile {
  requests: IRequestInfo[];
  domains: IDomainset;
  key: string;
}

export interface ICleanedRequestInfo {
  path: string;
  headers: string[];
  rawHeaders: string[];
  sameAgent: boolean;
  type: string;
}
