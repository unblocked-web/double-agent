import fs from 'fs';
import { getUseragentPath, saveUseragentProfile } from '@double-agent/runner/lib/profileHelper';
import OriginType from '@double-agent/runner/interfaces/OriginType';
import ResourceType from '@double-agent/runner/interfaces/ResourceType';
import IDetectionSession from '@double-agent/runner/interfaces/IDetectionSession';
import IRequestDetails from '@double-agent/runner/interfaces/IRequestDetails';

const profilesDir = process.env.PROFILES_DIR ?? `${__dirname}/../profiles`;

export default class HeaderProfile {
  public readonly agentGrouping: string;
  public readonly requests: IHeadersRequest[];
  public readonly useragent: string;

  public get browserAndVersion() {
    return this.agentGrouping.split('__').pop();
  }

  constructor(readonly session: IDetectionSession) {
    this.useragent = session.useragent;
    this.agentGrouping = getUseragentPath(session.useragent);

    this.requests = session.requests.map(x => HeaderProfile.processRequestDetails(x, session));
  }

  public async save() {
    if (!process.env.GENERATE_PROFILES) return;

    const data = {
      requests: this.requests,
      useragent: this.useragent,
    } as IProfile;

    await saveUseragentProfile(this.useragent, data, profilesDir);
  }

  public static processRequestDetails(x: IRequestDetails, session: IDetectionSession) {
    return {
      url: x.url,
      method: x.method,
      requestIdx: session.requests.indexOf(x),
      resourceType: x.resourceType,
      originType: x.originType,
      headers: x.headers,
      secureDomain: x.secureDomain,
    } as IHeadersRequest;
  }

  public static getAllProfiles() {
    const entries: IProfile[] = [];
    for (const filepath of fs.readdirSync(profilesDir)) {
      if (!filepath.endsWith('json') || filepath.startsWith('_')) continue;
      const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
      const json = JSON.parse(file) as IProfile;
      entries.push({ requests: json.requests, useragent: json.useragent });
    }
    return entries;
  }
}

export interface IProfile {
  requests: IHeadersRequest[];
  useragent: string;
}

export interface IHeadersRequest {
  url: string;
  method: string;
  headers: string[];
  requestIdx: number;
  secureDomain: boolean;
  resourceType: ResourceType;
  originType: OriginType;
}
