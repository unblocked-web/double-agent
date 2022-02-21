import * as Fs from 'fs';
import IOperatingSystem from '../interfaces/IOperatingSystem';
import DeviceCategory from '../interfaces/DeviceCategory';
import { FILE_PATH } from '../lib/OperatingSystems';
import { getOsNameFromId, getOsVersionFromOsId } from '../lib/OsUtils';
import extractReleaseDateAndDescription from '../lib/extractReleaseDateAndDescription';
import osDescriptions from '../data/manual/osDescriptions.json';
import ISlabData from '../interfaces/ISlabData';

export default class OsGenerator {
  private byId: { [id: string]: IOperatingSystem } = {};

  constructor(private slabData: ISlabData) {}

  public run() {
    for (const userAgent of this.slabData.userAgents) {
      // can't rely on user agent on mac after 10_15_7 (https://chromestatus.com/feature/5452592194781184)
      const id = userAgent.osId;
      const name = getOsNameFromId(id);
      const version = getOsVersionFromOsId(id);
      const marketshare = this.slabData.marketshare.byOsId[id] ?? 0;
      if (this.byId[id]) continue;

      let releaseDate = 'unknown';
      let description = '';
      try {
        [releaseDate, description] = extractReleaseDateAndDescription(
          id,
          name,
          osDescriptions,
          this.slabData.osReleaseDates,
        );
      } catch (err) {
        console.warn(
          '%s. Update descriptions at "%s" and release dates at "%s"',
          err.message,
          `../data/manual/osDescriptions.json`,
          `<SLAB_DATA>/basic/osReleaseDates.json`,
        );
      }

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
