import IOperatingSystemVersion from './IOperatingSystemVersion';

export default interface IOperatingSystem {
  key: string;
  name: string;
  desktopPercent: number;
  version: IOperatingSystemVersion;
}
