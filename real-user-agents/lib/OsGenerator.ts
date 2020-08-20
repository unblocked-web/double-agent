import * as Fs from 'fs';
import {lookup} from "useragent";
import {FILE_PATH} from "./OperatingSystems";
import useragents from '../data/useragents.json';
import { createOsId, createOsVersion, createOsName } from "./OsUtils";
import OsMarketshareGenerator from "./OsMarketshareGenerator";
import IOperatingSystem from "../interfaces/IOperatingSystem";
import DeviceCategory from "../interfaces/DeviceCategory";
import osExtras from '../data/custom/osExtras.json';
import extractReleaseDateAndDescription from './extractReleaseDateAndDescription';

export default class OsGenerator {
  private byId: { [id: string]: IOperatingSystem } = {};

  public run() {
    const osMarketshareGenerator = new OsMarketshareGenerator();
    for (const useragent of useragents) {
      const userAgent = lookup(useragent);
      const name = createOsName(userAgent.os.family);
      const version = createOsVersion(name, userAgent.os.major, userAgent.os.minor);
      const id = createOsId({ name, version });
      if (this.byId[id]) continue;

      const marketshare = osMarketshareGenerator.get(id);
      const [releaseDate, description] = extractReleaseDateAndDescription(name, id, osExtras);
      const osRelease: IOperatingSystem = {
        id,
        name,
        marketshare,
        deviceCategory: DeviceCategory.desktop,
        version,
        releaseDate,
        description,
      };
      this.byId[id] = osRelease;
    }
    return this;
  }

  public save() {
    const data = JSON.stringify(this.byId, null, 2);
    Fs.writeFileSync(FILE_PATH, data);
    return this;
  }
}
