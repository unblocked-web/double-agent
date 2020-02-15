import IDetectionDriver from './IDetectionDriver';

export default interface IDetectorModule {
  category: string;
  testName: string;
  summary: string;
  module?: IDetectionDriver;
  testCategories: string[];
}
