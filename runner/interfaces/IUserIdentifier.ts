import Layer from './Layer';
import UserBucket from './UserBucket';

export default interface IUserIdentifier {
  bucket: UserBucket;
  layer: Layer;
  id: string;
  raw: any;
  description?: string;
}
