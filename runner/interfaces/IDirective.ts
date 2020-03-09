import IDirectivePage from './IDirectivePage';

export default interface IDirective {
  useragent: string;
  browserGrouping: string;
  testType: 'intoli' | 'topBrowsers';
  pages: IDirectivePage[];
  sessionid: string;
}
