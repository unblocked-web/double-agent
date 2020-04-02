import 'source-map-support/register';
import fs from 'fs';
import getAllProfiles, { equalSupport, equalWebRtcCodecs } from './CodecProfile';
import ICodecProfile from '../interfaces/ICodecProfile';
import { lookup } from 'useragent';

const pluginDir = process.env.PLUGIN_DIR ?? `${__dirname}/../.plugins/`;

export default async function exportProfiles() {
  const profilesByBrowser: {
    [browser: string]: {
      profile: Omit<ICodecProfile, 'useragent'>;
      opSyses: string[];
    }[];
  }[] = [];
  for (const [fullBrowser, profiles] of Object.entries(getAllProfiles())) {
    const browser = fullBrowser.split('__').pop();
    if (!profilesByBrowser[browser]) profilesByBrowser[browser] = [];
    const bProfiles = profilesByBrowser[browser];
    for (const profile of profiles) {
      const matchingProfile = bProfiles.find(x => {
        return (
          equalSupport(x.profile.videoSupport, profile.videoSupport) &&
          equalSupport(x.profile.audioSupport, profile.audioSupport) &&
          equalWebRtcCodecs(x.profile.webRtcVideoCodecs, profile.webRtcVideoCodecs) &&
          equalWebRtcCodecs(x.profile.webRtcAudioCodecs, profile.webRtcAudioCodecs)
        );
      });
      const os = lookup(profile.useragent).os;
      const osString = `${os.family} ${os.major}.${os.minor}`;
      if (!matchingProfile) {
        const entry = {
          profile,
          opSyses: [osString],
        };
        delete entry.profile.useragent;
        bProfiles.push(entry);
      } else {
        if (!matchingProfile.opSyses.includes(osString)) matchingProfile.opSyses.push(osString);
      }
    }
  }

  for (const [browser, profile] of Object.entries(profilesByBrowser)) {
    const base = pluginDir + `/emulate-${browser.toLowerCase().replace('_', '-')}`;
    if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
    fs.writeFileSync(base + '/codecs.json', JSON.stringify(profile, null, 2));
  }
}
