import Fs from 'fs';
import IBrowser from '../interfaces/IBrowser';
import DeviceCategory from '../interfaces/DeviceCategory';
import { FILE_PATH } from '../lib/Browsers';
import { createBrowserId } from '../lib/BrowserUtils';
import extractReleaseDateAndDescription from '../lib/extractReleaseDateAndDescription';
import extractUserAgentMeta from '../lib/extractUserAgentMeta';
import browserDescriptions from '../data/manual/browserDescriptions.json';
import ISlabData from '../interfaces/ISlabData';

export default class BrowserGenerator {
  private byId: { [id: string]: IBrowser } = {};

  constructor(private slabData: ISlabData) {}

  public run() {
    for (const userAgentString of this.slabData.userAgentStrings) {
      const { name, version } = extractUserAgentMeta(userAgentString);
      const browserId = createBrowserId({ name, version });
      const marketshare = this.slabData.marketshare.byBrowserId[browserId];
      const [releaseDate, description] = extractReleaseDateAndDescription(
        browserId,
        name,
        browserDescriptions,
        this.slabData.browserReleaseDates,
      );
      const browser: IBrowser = {
        id: browserId,
        name,
        marketshare,
        version,
        deviceCategory: DeviceCategory.desktop,
        releaseDate,
        description,
      };
      this.byId[browserId] = browser;
    }
    return this;
  }

  public save() {
    const browserEnginesData = JSON.stringify(this.byId, null, 2);
    Fs.writeFileSync(FILE_PATH, browserEnginesData);
    return this;
  }
}
