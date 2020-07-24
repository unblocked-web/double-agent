import IBrowserVersion from './IBrowserVersion';
import IBrowserOperatingSystem from './IBrowserOperatingSystem';

export default interface IBrowser {
  key: string;
  name: string;
  desktopPercent: number;
  version: IBrowserVersion;
  byOsKey: {
    [key: string]: IBrowserOperatingSystem;
  }
}
