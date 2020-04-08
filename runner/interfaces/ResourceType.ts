enum ResourceType {
  Document = 'Document',
  Redirect = 'Redirect',
  WebsocketUpgrade = 'Websocket Upgrade',
  WebsocketMessage = 'Websocket Message',
  Ico = 'Ico',
  Preflight = 'Preflight',
  Script = 'Script',
  Stylesheet = 'Stylesheet',
  Xhr = 'Xhr',
  Fetch = 'Fetch',
  Image = 'Image',
  Media = 'Media',
  Font = 'Font',
  TextTrack = 'Text Track',
  EventSource = 'Event Source',
  Manifest = 'Manifest',
  SignedExchange = 'Signed Exchange',
  Ping = 'Ping',
  CSPViolationReport = 'CSP Violation Report',
  Other = 'Other'
}
const values = Object.values(ResourceType);
export function getResourceType(type: string): ResourceType | null {
  if (ResourceType[type]) return ResourceType[type];
  if (values.includes(type as ResourceType)) return type as ResourceType;
  return null;
}
export default ResourceType;
