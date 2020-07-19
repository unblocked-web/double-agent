import ProfilerData from '../data';

export default function getKnownUseragentStrings() {
  return ProfilerData.getByPluginId('tcp/tls').map(p => p.useragent);
}
