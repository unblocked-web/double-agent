import {IServerProtocol} from "../servers/BaseServer";
import {DomainType} from "../lib/DomainUtils";
import OriginType from "./OriginType";

export default interface IHeaderDataPage {
  pageName: string;
  method: string;
  protocol: IServerProtocol;
  domainType: DomainType;
  originType: OriginType;
  pathname: string;
  referer: string;
  rawHeaders: string[][];
}
