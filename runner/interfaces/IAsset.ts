import ResourceType from './ResourceType';
import HostDomain from './HostDomain';
import Layer from './Layer';
import OriginType from './OriginType';

export default interface IAsset {
  secureDomain: boolean;
  resourceType: ResourceType;
  hostDomain?: HostDomain;
  originType?: OriginType;
  layer: Layer;
  referer?: string;
}
