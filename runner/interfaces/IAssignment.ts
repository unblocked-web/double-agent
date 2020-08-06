import IAssignmentPage from './IAssignmentPage';
import { IBrowserToTestPickType, IBrowserToTestUsagePercent } from '@double-agent/profiler/lib/BrowsersToTest';

export default interface IAssignment {
  id: number;
  useragent: string;
  pickType: IBrowserToTestPickType;
  profileDirName: string;
  usagePercent: IBrowserToTestUsagePercent;
  pages: IAssignmentPage[];
  sessionId: string;
  isCompleted?: boolean;
}
