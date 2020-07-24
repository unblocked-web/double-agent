import IDirectivePage from './IDirectivePage';

export default interface IDirective {
  useragent: string;
  profileDirName: string;
  percentOfTraffic: number;
  testType: 'intoli' | 'topBrowsers';
  pages: IDirectivePage[];
  sessionid: string;
}
