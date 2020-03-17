import HostDomain from './HostDomain';
import ResourceType from './ResourceType';
import OriginType from './OriginType';
import { Moment } from 'moment';

export default interface IRequestDetails {
  url: string;
  method: string;
  time: Moment;
  remoteAddress: string;
  useragent: string;
  headers: string[];
  origin: string;
  secureDomain: boolean;
  originType: OriginType;
  resourceType: ResourceType;
  hostDomain: HostDomain;
  bodyJson?: object;
  referer?: string;
  cookies?: { [key: string]: string };
  setCookies?: string[];
}
