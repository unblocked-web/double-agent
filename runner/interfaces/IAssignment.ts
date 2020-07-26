import IAssignmentPage from './IAssignmentPage';

export default interface IAssignment {
  useragent: string;
  profileDirName: string;
  percentOfTraffic: number;
  testType: 'intoli' | 'topBrowsers';
  pages: IAssignmentPage[];
  sessionid: string;
}
