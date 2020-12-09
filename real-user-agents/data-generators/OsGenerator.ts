import * as Fs from 'fs';
import IOperatingSystem from '../interfaces/IOperatingSystem';
import DeviceCategory from '../interfaces/DeviceCategory';
import { FILE_PATH } from '../lib/OperatingSystems';
import { createOsId, createOsVersion, createOsName } from '../lib/OsUtils';
import extractReleaseDateAndDescription from '../lib/extractReleaseDateAndDescription';
import extractUserAgentMeta from '../lib/extractUserAgentMeta';
import osDescriptions from '../data/manual/osDescriptions.json';
import ISlabData from '../interfaces/ISlabData';

export default class OsGenerator {
  private byId: { [id: string]: IOperatingSystem } = {};

  constructor(private slabData: ISlabData) {}

  public run() {
    for (const userAgentString of this.slabData.userAgentStrings) {
      const { osName, osVersion } = extractUserAgentMeta(userAgentString);
      const name = createOsName(osName);
      const version = createOsVersion(name, osVersion.major, osVersion.minor);
      const id = createOsId({ name, version });
      const marketshare = this.slabData.marketshare.byOsId[id];
      if (this.byId[id]) continue;

      const [releaseDate, description] = extractReleaseDateAndDescription(
        id,
        name,
        osDescriptions,
        this.slabData.osReleaseDates,
      );

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
