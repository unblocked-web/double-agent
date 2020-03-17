import IDetectionPlugin from './IDetectionPlugin';
import Layer from './Layer';

export default interface IDetectorModule {
  layer: Layer;
  name: string;
  summary: string;
  dir: string;
  plugin?: IDetectionPlugin;
  checkCategories: string[];
}
