import IInstructionPage from './IInstructionPage';

export default interface IInstruction {
  useragent: string;
  profileDirName: string;
  percentOfTraffic: number;
  testType: 'intoli' | 'topBrowsers';
  pages: IInstructionPage[];
  sessionid: string;
}
