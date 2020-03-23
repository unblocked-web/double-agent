import Layer from './Layer';

export default interface ICheckCounter {
  checkName: string;
  category: string;
  count: number;
  layer: Layer;
}
