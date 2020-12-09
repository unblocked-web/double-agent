import IUserAgent from '../interfaces/IUserAgent';
import OperatingSystems from './OperatingSystems';
import Browsers from './Browsers';

export default class UserAgent implements IUserAgent {
  public id: string;
  public strings: string[] = [];
  public operatingSystemId: string;
  public browserId: string;
  public marketshare: number;

  constructor(id, strings, operatingSystemId, browserId, marketshare) {
    this.id = id;
    this.strings = strings;
    this.operatingSystemId = operatingSystemId;
    this.browserId = browserId;
    this.marketshare = marketshare;
  }

  public get operatingSystem() {
    return OperatingSystems.byId(this.operatingSystemId);
  }

  public get browser() {
    return Browsers.byId(this.browserId);
  }

  public static load(object: IUserAgent) {
    const { id, strings, operatingSystemId, browserId, marketshare } = object;
    return new this(id, strings, operatingSystemId, browserId, marketshare);
  }
}
