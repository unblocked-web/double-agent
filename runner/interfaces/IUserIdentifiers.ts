import Layer from './Layer';

export default interface IUserIdentifiers {
  name: string;
  layer: Layer;
  id: string;
  raw: any;
  description?: string;
}
