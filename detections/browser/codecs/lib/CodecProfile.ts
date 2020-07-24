import ICodecProfile from '../interfaces/ICodecProfile';
import ICodecSupport from '../interfaces/ICodecSupport';
import IWebRTCCodec from '../interfaces/IWebRTCCodec';
import ProfilerData from '@double-agent/profiler/data';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';

const pluginId = 'browser/codecs';
const profilesByDirName: { [dirName: string]: ICodecProfile[] } = {};

export function cleanProfile(useragent: string, data: ICodecProfile) {
  data.useragent = useragent;
  data.audioSupport.probablyPlays.sort();
  data.audioSupport.maybePlays.sort();
  data.audioSupport.recordingFormats.sort();
  data.videoSupport.probablyPlays.sort();
  data.videoSupport.maybePlays.sort();
  data.videoSupport.recordingFormats.sort();
  data.webRtcAudioCodecs.sort(webRtcSort);
  data.webRtcVideoCodecs.sort(webRtcSort);
  return data;
}

export default function getAllProfiles() {
  if (Object.keys(profilesByDirName).length) return profilesByDirName;

  ProfilerData.getByPluginId<ICodecProfile>(pluginId).forEach(profile => {
    const profileDirName = getProfileDirNameFromUseragent(profile.useragent);
    profilesByDirName[profileDirName] = profilesByDirName[profileDirName] || [];
    profilesByDirName[profileDirName].push(profile);
  });

  return profilesByDirName;
}

export function getProfileForUa(useragent: string): ICodecProfile {
  const profileDirName = getProfileDirNameFromUseragent(useragent);
  const browserProfile = getAllProfiles()[profileDirName];
  if (browserProfile?.length) return browserProfile[0];
  return null;
}

export function equalProfiles(
  a: Pick<ICodecProfile, 'audioSupport' | 'videoSupport'>,
  b: ICodecProfile,
) {
  if (!equalSupport(a.audioSupport, b.audioSupport)) return false;
  if (!equalSupport(a.videoSupport, b.videoSupport)) return false;

  return true;
}

export function equalWebRtcCodecs(a: IWebRTCCodec[], b: IWebRTCCodec[]) {
  if (a.length !== b.length) return false;
  const aMap = [...new Set(a.map(x => x.mimeType ?? (x as any).name))].sort().toString();
  const bMap = [...new Set(b.map(x => x.mimeType ?? (x as any).name))].sort().toString();

  return aMap === bMap;
}

export function equalSupport(a: ICodecSupport, b: ICodecSupport) {
  if (a.maybePlays.toString() !== b.maybePlays.toString()) return false;
  if (a.probablyPlays.toString() !== b.probablyPlays.toString()) return false;
  if (a.recordingFormats.toString() !== b.recordingFormats.toString()) return false;
  return true;
}

function getWebRtcString(codec: IWebRTCCodec | any) {
  return codec.clockRate + '-' + (codec.mimeType ?? (codec as any).name);
}

export function convertWebRtcCodecsToString(codecs: IWebRTCCodec[]) {
  return [...new Set(codecs.map(getWebRtcString))].sort().toString();
}

function webRtcSort(a: IWebRTCCodec, b: IWebRTCCodec) {
  const mimeCompare = (a.mimeType ?? '').localeCompare(b.mimeType ?? '');
  if (mimeCompare !== 0) return mimeCompare;
  const clockCompare = a.clockRate - b.clockRate;
  if (clockCompare !== 0) return clockCompare;
  return (a.sdpFmtpLine ?? '').localeCompare(b.sdpFmtpLine ?? '');
}
