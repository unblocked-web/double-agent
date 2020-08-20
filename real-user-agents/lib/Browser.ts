import IBrowser from "../interfaces/IBrowser";
import IBrowserVersion from "../interfaces/IBrowserVersion";
import {IDeviceCategory} from "../interfaces/DeviceCategory";
import UserAgents from '../index';

export default class Browser implements IBrowser {
  public id: string;
  public name: string;
  public marketshare: number;
  public version: IBrowserVersion;
  public deviceCategory: IDeviceCategory;
  public releaseDate: string;
  public description: string;

  constructor(id, name, marketshare, version, deviceCategory, releaseDate, description) {
    this.id = id;
    this.name = name;
    this.marketshare = marketshare;
    this.version = version;
    this.deviceCategory = deviceCategory;
    this.releaseDate = releaseDate;
    this.description = description;
  }

  public get operatingSystemIds() {
    return UserAgents.where({ browserId: this.id }).map(x => x.operatingSystemId);
  }

  public static load(object: IBrowser) {
    const { id, name, marketshare, version, deviceCategory, releaseDate, description } = object;
    return new this(id, name, marketshare, version, deviceCategory, releaseDate, description);
  }
}
