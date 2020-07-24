export default interface IBrowserOperatingSystem {
  key: string;
  desktopPercent: number;
  hasBrowserStackSupport: boolean;
  useragents: {
    string: string;
    sources: string[];
  }[];
}
