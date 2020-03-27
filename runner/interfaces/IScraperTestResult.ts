import IBrowserFindings, { IBrowserPercents } from './IBrowserFindings';
import IUserBucketAverages from './IUserBucketAverages';

export default interface IScraperTestResult {
  title: string;
  description: string;
  browserFindings: IBrowserFindings;
  intoliBrowsers: IBrowserPercents[];
  topBrowsers: IBrowserPercents[];
  buckets: IUserBucketAverages;
}
