import Fs from 'fs';
import { lookup } from 'useragent';
import { FILE_PATH } from './Browsers';
import IBrowser from '../interfaces/IBrowser';
import DeviceCategory from '../interfaces/DeviceCategory';
import { createBrowserId } from './BrowserUtils';
import useragents from '../data/useragents.json';
import extractReleaseDateAndDescription from './extractReleaseDateAndDescription';
import browserExtras from '../data/custom/browserExtras.json';
import BrowserMarketshareGenerator from './BrowserMarketshareGenerator';

export default class BrowserGenerator {
  private byId: { [id: string]: IBrowser } = {};

  public run() {
    const browserMarketshareGenerator = new BrowserMarketshareGenerator();

    for (const useragent of useragents) {
      const { family: name, major, minor, patch } = lookup(useragent);
      const version = { major, minor, patch };
      const browserId = createBrowserId({ name, version });
      const [releaseDate, description] = extractReleaseDateAndDescription(
        name,
        browserId,
        browserExtras,
      );
      const browser: IBrowser = {
        id: browserId,
        name,
        marketshare: browserMarketshareGenerator.get(browserId),
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
