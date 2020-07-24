import Browsers from './Browsers';
import { IByType, FILE_PATH } from './BrowsersToTest';
import Fs from 'fs';

export default class BrowsersToTestGenerator {
  private byType: IByType;

  public async run() {
    this.byType = { majority: [], intoli: [] };
    const unsortedInstances = [];
    new Browsers().toArray().forEach(browser => {
      Object.values(browser.byOsKey).forEach(instance => {
        const { key: osKey, desktopPercent, hasBrowserStackSupport, useragents } = instance;
        unsortedInstances.push({
          browserKey: browser.key,
          osKey,
          desktopPercent,
          hasBrowserStackSupport,
          useragents,
        })
      });
    })

    const sortedInstances = unsortedInstances.sort((a, b) => {
      if (a.desktopPercent < b.desktopPercent) {
        return 1
      } else if (a.desktopPercent > b.desktopPercent) {
        return -1;
      } else {
        return 0;
      }
    });

    let totalPercentage = 0;
    const majorityInstances = [];
    const intoliInstances = [];

    for (const instance of sortedInstances) {
      if (totalPercentage < 50 && instance.useragents.find(x => x.sources.includes('BrowserStack'))) {
        majorityInstances.push(instance);
        totalPercentage += instance.desktopPercent;
      }
      if (instance.useragents.find(x => x.sources.includes('Intoli'))) {
        intoliInstances.push(instance);
      }
    }

    for (const instance of majorityInstances) {
      const useragentObjs = instance.useragents.filter(x => x.sources.includes('BrowserStack'));
      this.byType.majority.push({
        browserKey: instance.browserKey,
        osKey: instance.osKey,
        tests: useragentObjs.map(useragentObj => {
          return {
            useragent: useragentObj.string,
            usagePercent: instance.desktopPercent / useragentObjs.length,
          }
        }),
      });
    }

    for (const instance of intoliInstances) {
      const useragentObjs = instance.useragents.filter(x => x.sources.includes('Intoli'));
      this.byType.intoli.push({
        browserKey: instance.browserKey,
        osKey: instance.osKey,
        tests: useragentObjs.map(useragentObj => {
          return {
            useragent: useragentObj.string,
            usagePercent: useragentObj.sources.filter(x => x === 'Intoli').length * 2,
          }
        }),
      });
    }
  }

  public save() {
    const data = JSON.stringify(this.byType, null, 2);
    Fs.writeFileSync(FILE_PATH, data);
  }
}
