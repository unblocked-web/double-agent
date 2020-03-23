import IDirectivePage from './IDirectivePage';

export default interface IDirective {
  useragent: string;
  browserGrouping: string;
  percentOfTraffic: number;
  testType: 'intoli' | 'topBrowsers';
  pages: IDirectivePage[];
  sessionid: string;
}
