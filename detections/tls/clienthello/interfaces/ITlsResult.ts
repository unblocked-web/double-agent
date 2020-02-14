import { IClientHello } from '../lib/parseHelloMessage';

export default interface ITlsResult {
  match: boolean;
  useragent: string;
  hasGrease?: boolean;
  reason?: string;
  ja3Extended?: string;
  ja3ExtendedMd5?: string;
  ja3?: string;
  ja3Md5?: string;
  ja3MatchFor?: string[];
  ja3erMatchFor?: string;
  clientHello?: IClientHello;
}
