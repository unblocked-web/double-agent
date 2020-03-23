import Layer from './Layer';
import UserBucket from './UserBucket';

export default interface IUserIdentifier {
  bucket: UserBucket;
  layer: Layer;
  category: string;
  id: string;
  raw?: any;
  description?: string;
}
