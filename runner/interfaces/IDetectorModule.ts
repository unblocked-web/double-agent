import IDetectionPlugin from './IDetectionPlugin';

export default interface IDetectorModule {
  layer: string;
  name: string;
  summary: string;
  dir: string;
  plugin?: IDetectionPlugin;
  checkCategories: string[];
}
