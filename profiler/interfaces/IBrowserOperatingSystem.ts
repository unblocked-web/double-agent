import IBrowserUseragent from './IBrowserUseragent';

export default interface IBrowserOperatingSystem {
  key: string;
  desktopPercent: number;
  hasBrowserStackSupport: boolean;
  useragents: IBrowserUseragent[];
}
