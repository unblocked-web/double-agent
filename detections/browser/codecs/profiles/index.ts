import fs from 'fs';
import ICodecProfile from '../interfaces/ICodecProfile';
import { getUseragentPath } from '@double-agent/runner/lib/useragentProfileHelper';
import ICodecSupport from '../interfaces/ICodecSupport';
import IWebRTCCodec from '../interfaces/IWebRTCCodec';

const profilesDir = process.env.PROFILES_DIR ?? `${__dirname}`;

const entries: { [browserName: string]: ICodecProfile[] } = {};

export default function getAllProfiles() {
  if (Object.keys(entries).length) return entries;

  for (const filepath of fs.readdirSync(profilesDir)) {
    if (!filepath.endsWith('json')) continue;
    const file = fs.readFileSync(`${profilesDir}/${filepath}`, 'utf8');
    const json = JSON.parse(file) as ICodecProfile;
    const browserName = filepath.split('--').shift();
    if (!entries[browserName]) {
      entries[browserName] = [];
    }
    entries[browserName].push(json);
  }
  return entries;
}

export function getProfileForUa(userAgent: string): ICodecProfile {
  const uaGroup = getUseragentPath(userAgent);
  const browserProfile = getAllProfiles()[uaGroup];
  if (browserProfile.length) return browserProfile[0];
  return {
    audioSupport: { recordingFormats: [], probablyPlays: [], maybePlays: [] },
    videoSupport: { recordingFormats: [], probablyPlays: [], maybePlays: [] },
    webRtcVideoCodecs: [],
    webRtcAudioCodecs: [],
    useragent: '',
  };
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

export function findUniqueWebRTCProfiles() {
  const uniqueProfiles: {
    profile: { videoMimes: string; audioMimes: string };
    uaGroups: string[];
    useragents: string[];
  }[] = [];
  for (const [browser, profiles] of Object.entries(getAllProfiles())) {
    for (const profile of profiles) {
      const audioMimes = convertWebRtcCodecsToString(profile.webRtcAudioCodecs);
      const videoMimes = convertWebRtcCodecsToString(profile.webRtcVideoCodecs);

      let existing = uniqueProfiles.find(
        x => x.profile.audioMimes === audioMimes && x.profile.videoMimes === videoMimes,
      );
      if (!existing) {
        existing = {
          useragents: [],
          uaGroups: [],
          profile: { videoMimes, audioMimes },
        };
        uniqueProfiles.push(existing);
      }
      if (!existing.uaGroups.includes(browser)) {
        existing.uaGroups.push(browser);
        existing.useragents.push(profile.useragent);
      }
    }
  }
  return uniqueProfiles;
}

export function findUniqueProfiles() {
  const uniqueProfiles: {
    profile: Omit<ICodecProfile, 'useragent'>;
    uaGroups: string[];
    useragents: string[];
  }[] = [];
  for (const [browser, profiles] of Object.entries(getAllProfiles())) {
    for (const profile of profiles) {
      let existing = uniqueProfiles.find(x => equalProfiles(x.profile, profile));
      if (!existing) {
        existing = { uaGroups: [], profile, useragents: [] };
        uniqueProfiles.push(existing);
      }
      if (!existing.uaGroups.includes(browser)) {
        existing.uaGroups.push(browser);
        existing.useragents.push(profile.useragent);
      }
    }
  }
  return uniqueProfiles;
}
