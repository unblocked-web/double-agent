import IDetectionResult from './IDetectionResult';

export default interface IDetectionResultset {
  category: string;
  testName: string;
  results: IDetectionResult[];
}
