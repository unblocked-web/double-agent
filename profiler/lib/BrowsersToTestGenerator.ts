import * as Fs from 'fs';
import Browsers from './Browsers';
import { FILE_PATH, IBrowserToTest, IBrowserToTestPickType} from './BrowsersToTest';
import IBrowserUseragent from '../interfaces/IBrowserUseragent';

interface ITmpInstance {
  browserKey: string;
  osKey: string;
  desktopPercent: number;
  hasBrowserStackSupport: boolean;
  useragents: IBrowserUseragent[];
  pickType: IBrowserToTestPickType,
}

export default class BrowsersToTestGenerator {
  private instances: IBrowserToTest[];

  public async run() {
    this.instances = [];

    const unsortedInstances: ITmpInstance[] = [];
    new Browsers().toArray().forEach(browser => {
      Object.values(browser.byOsKey).forEach(instance => {
        const { key: osKey, desktopPercent, hasBrowserStackSupport, useragents } = instance;
        unsortedInstances.push({
          browserKey: browser.key,
          osKey,
          desktopPercent,
          hasBrowserStackSupport,
          useragents,
          pickType: [],
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
    const testInstances = [];
    for (const instance of sortedInstances) {
      if (totalPercentage < 50 && instance.useragents.find(x => x.sources.includes('BrowserStack'))) {
        instance.pickType.push('majority');
        totalPercentage += instance.desktopPercent;
      }
      if (instance.useragents.find(x => x.sources.includes('Intoli'))) {
        instance.pickType.push('random');
      }
      if (instance.pickType.length) {
        testInstances.push(instance);
      }
    }

    for (const instance of testInstances) {
      this.instances.push({
        browserKey: instance.browserKey,
        osKey: instance.osKey,
        pickType: instance.pickType,
        usagePercent: {
          majority: instance.pickType.includes('majority') ? instance.desktopPercent : 0,
          random: instance.pickType.includes('random') ? 2 : 0,
        },
        useragents: instance.useragents,
      });
    }
  }

  public save() {
    const data = JSON.stringify(this.instances, null, 2);
    Fs.writeFileSync(FILE_PATH, data);
  }
}
