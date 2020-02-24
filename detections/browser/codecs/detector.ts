import * as http from 'http';
import { Server, ServerResponse } from 'http';
import AbstractDetectorDriver from '@double-agent/runner/lib/AbstractDetectorDriver';
import IDirective from '@double-agent/runner/lib/IDirective';
import { isDirectiveMatch } from '@double-agent/runner/lib/agentHelper';
import { readFileSync } from 'fs';
import csv from 'csv-parse/lib/sync';
import { saveUseragentProfile } from '@double-agent/runner/lib/useragentProfileHelper';
import ICodecProfile from './interfaces/ICodecProfile';
import {
  convertWebRtcCodecsToString,
  findUniqueProfiles,
  findUniqueWebRTCProfiles,
  getProfileForUa,
} from './profiles';
import IWebRTCCodec from './interfaces/IWebRTCCodec';
import ICodecSupport from './interfaces/ICodecSupport';
import { inspect } from 'util';
import getBrowserDirectives from '@double-agent/profiler/lib/getBrowserDirectives';

export default class Detector extends AbstractDetectorDriver {
  private server: Server;
  private port: number;

  protected directives: IDirective[] = [];
  protected dirname = __dirname;

  public etcHostEntries = ['ulixee-test.org'];

  public async start(getPort: () => number) {
    this.port = getPort();
    const url = `http://ulixee-test.org:${this.port}`;

    const profiles = findUniqueProfiles();
    const loadedProfiles = new Set<string>();
    const directives = await getBrowserDirectives([...profiles, ...findUniqueWebRTCProfiles()]);
    for (const { directive } of directives) {
      if (loadedProfiles.has(directive.useragent)) continue;
      loadedProfiles.add(directive.useragent);
      this.directives.push({
        ...directive,
        url,
        waitForElementSelector: 'body.complete',
      });
    }

    console.log(inspect(this.directives, false, 4, true));

    return new Promise<void>(resolve => {
      this.server = http.createServer(this.serverListener.bind(this)).listen(this.port, () => {
        console.log('Audio Codecs test started on %s', this.server.address());
        resolve();
      });
    });
  }

  public async stop() {
    this.server.close();
  }

  private async serverListener(req: http.IncomingMessage, res: ServerResponse) {
    const userAgent = req.headers['user-agent'];

    if (!userAgent) {
      this.directiveNotRun('No user agent provided');
      res.writeHead(400, {
        'content-type': 'text/html',
      });
      res.write('<html><body><bold style="color:red">No user agent provided</bold></body></html>');
      return res.end();
    }
    if (this.activeDirective) {
      if (!isDirectiveMatch(this.activeDirective, userAgent)) {
        this.directiveNotRun('Wrong user agent provided');
        res.writeHead(400, {
          'content-type': 'text/html',
        });
        res.write(
          '<html><body><bold style="color:red">Wrong user agent provided</bold></body></html>',
        );
        return res.end();
      }
    }

    if (req.url === '/result') {
      let body = '';
      for await (const chunk of req) {
        body += chunk.toString();
      }
      const bodyJson = JSON.parse(body) as ICodecProfile;
      bodyJson.audioSupport.probablyPlays.sort();
      bodyJson.audioSupport.maybePlays.sort();
      bodyJson.audioSupport.recordingFormats.sort();
      bodyJson.videoSupport.probablyPlays.sort();
      bodyJson.videoSupport.maybePlays.sort();
      bodyJson.videoSupport.recordingFormats.sort();
      bodyJson.webRtcAudioCodecs.sort(webRtcSort);
      bodyJson.webRtcVideoCodecs.sort(webRtcSort);

      if (process.env.GENERATE_PROFILES) {
        bodyJson.useragent = userAgent;
        saveUseragentProfile(userAgent, bodyJson, __dirname + '/profiles');
      }

      if (this.activeDirective) {
        const browserProfile = getProfileForUa(userAgent);

        for (const support of ['audio', 'video']) {
          const title = support.charAt(0).toUpperCase() + support.slice(1);
          const bodySupport = bodyJson[support + 'Support'] as ICodecSupport;
          const profileSupport = browserProfile[support + 'Support'] as ICodecSupport;
          this.recordResult(
            bodySupport.probablyPlays.toString() === profileSupport.probablyPlays.toString(),
            {
              category: title + ' Codecs Supported',
              name: title + ' "Probably" Playback Codecs',
              value: bodySupport.probablyPlays.toString(),
              expected: profileSupport.probablyPlays.toString(),
              useragent: userAgent,
            },
          );
          this.recordResult(
            bodySupport.maybePlays.toString() === profileSupport.maybePlays.toString(),
            {
              category: title + ' Codecs Supported',
              name: title + ' "Maybe" Playback Codecs',
              value: bodySupport.probablyPlays.toString(),
              expected: profileSupport.probablyPlays.toString(),
              useragent: userAgent,
            },
          );
          this.recordResult(
            bodySupport.recordingFormats.toString() === profileSupport.recordingFormats.toString(),
            {
              category: title + ' Codecs Supported',
              name: title + ' Recording Codecs',
              value: bodySupport.recordingFormats.toString(),
              expected: profileSupport.recordingFormats.toString(),
              useragent: userAgent,
            },
          );
          const expected = convertWebRtcCodecsToString(browserProfile[`webRtc${title}Codecs`]);
          const value = convertWebRtcCodecsToString(bodyJson[`webRtc${title}Codecs`]);
          this.recordResult(expected === value, {
            category: `WebRTC ${title} Codecs Supported`,
            name: `WebRTC ${title} MimeTypes and ClockRate Match`,
            value,
            expected,
            useragent: userAgent,
          });
        }
      }

      return res
        .writeHead(200, {
          'content-type': 'application/json',
        })
        .end(JSON.stringify({ success: true }));
    }

    res.writeHead(200, {
      'content-type': 'text/html',
    });
    res.write(`
<html>
<body>
<h1>Codecs Analysis</h1>
<h5>Video Recording Formats</h5>
<pre id="video-records"></pre>
<h5>Video Probably Plays</h5>
<pre id="video-probably-plays"></pre>
<h5>Video Maybe Plays</h5>
<pre id="video-maybe-plays"></pre>
<h5>WebRTC Video</h5>
<pre id="webrtc-video"></pre>

<h5>Audio Recording Formats</h5>
<pre id="audio-records"></pre>
<h5>Audio Probably Plays</h5>
<pre id="audio-probably-plays"></pre>
<h5>Audio Maybe Plays</h5>
<pre id="audio-maybe-plays"></pre>
<h5>WebRTC Audio</h5>
<pre id="webrtc-audio"></pre>

</body>
<script type="text/javascript">
const videoMimes = ${JSON.stringify(videoMimes)};
const audioMimes = ${JSON.stringify(audioMimes)};
const codecs = ${JSON.stringify(codecs)};
const videoElt = document.createElement('video');
const audioElt = document.createElement('audio');
const videoSupport = {
  recordingFormats: [],
  probablyPlays: [],
  maybePlays: []
};
const audioSupport = {
  recordingFormats: [],
  probablyPlays: [],
  maybePlays: []
};

var webRtcAudioCodecs = [];
var webRtcVideoCodecs = [];

if (window["RTCRtpSender"] && RTCRtpSender.getCapabilities) {
  webRtcAudioCodecs = RTCRtpSender.getCapabilities("audio").codecs || [];
  webRtcVideoCodecs = RTCRtpSender.getCapabilities("video").codecs || [];
}


for (const format of audioMimes) {
  {
    const isTypeAllowed = window["MediaRecorder"] && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(format);
    if (isTypeAllowed) audioSupport.recordingFormats.push(format);
    const canPlay = audioElt.canPlayType(format);
    if (canPlay === 'probably') audioSupport.probablyPlays.push(format);
    if (canPlay === 'maybe') audioSupport.maybePlays.push(format);
      
  }

  for (const codec of codecs) {
    const formatPlusCodec= format + ';codecs=' + codec;
    const isTypeAllowed = window["MediaRecorder"] && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(formatPlusCodec);
    if (isTypeAllowed) audioSupport.recordingFormats.push(formatPlusCodec);
    const canPlay = audioElt.canPlayType(formatPlusCodec);
    if (canPlay === 'probably') audioSupport.probablyPlays.push(formatPlusCodec);
    if (canPlay === 'maybe') audioSupport.maybePlays.push(formatPlusCodec);
  }
}

for (const format of videoMimes) {
  {
    const isTypeAllowed = window["MediaRecorder"] && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(format);
    if (isTypeAllowed) videoSupport.recordingFormats.push(format);
    const canPlay = videoElt.canPlayType(format);
    if (canPlay === 'probably') videoSupport.probablyPlays.push(format);
    if (canPlay === 'maybe') videoSupport.maybePlays.push(format);
      
  }

  for (const codec of codecs) {
    const formatPlusCodec= format + ';codecs=' + codec;
    const isTypeAllowed = window["MediaRecorder"] && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(formatPlusCodec);
    if (isTypeAllowed) videoSupport.recordingFormats.push(formatPlusCodec);
    const canPlay = videoElt.canPlayType(formatPlusCodec);
    if (canPlay === 'probably') videoSupport.probablyPlays.push(formatPlusCodec);
    if (canPlay === 'maybe') videoSupport.maybePlays.push(formatPlusCodec);
  }
}

document.querySelector('#video-records').innerHTML = videoSupport.recordingFormats.join('\\n');
document.querySelector('#video-probably-plays').innerHTML = videoSupport.probablyPlays.join('\\n');
document.querySelector('#video-maybe-plays').innerHTML = videoSupport.maybePlays.join('\\n');
document.querySelector('#audio-records').innerHTML = audioSupport.recordingFormats.join('\\n');
document.querySelector('#audio-probably-plays').innerHTML = audioSupport.probablyPlays.join('\\n');
document.querySelector('#audio-maybe-plays').innerHTML = audioSupport.maybePlays.join('\\n');
document.querySelector('#webrtc-video').innerHTML = JSON.stringify(webRtcVideoCodecs, null, 2);
document.querySelector('#webrtc-audio').innerHTML = JSON.stringify(webRtcAudioCodecs, null, 2);
document.querySelector('body').classList.add('complete')


fetch('/result', {
  method: 'post',
  headers: { 'content-type': 'application/json'},
  body: JSON.stringify({ audioSupport, videoSupport, webRtcAudioCodecs, webRtcVideoCodecs })
});


</script>
</html>`);
    res.end();
  }
}

function webRtcSort(a: IWebRTCCodec, b: IWebRTCCodec) {
  const mimeCompare = (a.mimeType ?? '').localeCompare(b.mimeType ?? '');
  if (mimeCompare !== 0) return mimeCompare;
  const clockCompare = a.clockRate - b.clockRate;
  if (clockCompare !== 0) return clockCompare;
  return (a.sdpFmtpLine ?? '').localeCompare(b.sdpFmtpLine ?? '');
}

const audioMimeAlternatives = csv(readFileSync(__dirname + '/mime/audio-mimetypes.csv', 'utf8'))
  .slice(1)
  .map(x => x[1].toLowerCase())
  .filter(Boolean);

const videoMimeAlternatives = csv(readFileSync(__dirname + '/mime/video-mimetypes.csv', 'utf8'))
  .slice(1)
  .map(x => x[1].toLowerCase())
  .filter(Boolean);

const applicationMimeAlternatives = csv(
  readFileSync(__dirname + '/mime/application-mimetypes.csv', 'utf8'),
)
  .slice(1)
  .map(x => x[1].toLowerCase())
  .filter(Boolean);

const audioMimes = [
  ...new Set([
    'audio/flac',
    'audio/mp3',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/x-m4a',
    'audio/alac',
    'audio/amr-wb',
    'audio/amr-mb',
    'application/x-mpegurl',
    'audio/mpeg',
    ...audioMimeAlternatives,
    ...applicationMimeAlternatives,
  ]),
];

const videoMimes = [
  ...new Set([
    'video/mp4',
    'video/ogg',
    'video/quicktime',
    'video/3gpp',
    'video/3gp2',
    'video/webm',
    'video/x-m4a',
    'video/mpeg',
    'video/x-matroska',
    ...videoMimeAlternatives,
    ...applicationMimeAlternatives,
  ]),
];

const codecs = [
  'h264',
  'H264',
  'h264,vp9,opus',
  'h264,vp8,opus',
  'vp8,pcm',
  'vp8,opus',
  'vp8,vorbis',
  'vp9,pcm',
  'vp9,opus',
  'vp9,vorbis',
  'vp8',
  'vp9',
  'vp8.0',
  'vp9.0',
  'vorbis',
  'opus',
  'avc1',
  'avc1.42E01E',
  'avc1.42E01F',
  'avc1.4D401F',
  'avc1.4D4028',
  'avc1.640028',
  'avc1.640029',
  'dvhe.05.06',
  'dvhe.05.07',
  'dvhe.05.09',
  'dvhe.08.06',
  'dvhe.08.07',
  'dvhe.08.09',
  'hev1.1.6.L150.B0',
  'hev1.1.6.L153.B0',
  'hev1.2.6.L150.B0',
  'hev1.2.6.L153.B0',
  'pcm',
  '1',
  'mp3',
  'mp4a.40.2',
  'mp4a.40.5',
  'mp4a.69',
  'mp4a.6B',
  'mp4a.40.05',
  'mp4a.a5',
  'mp4a.a6',
  'ac-3',
  'ec-3',
  'mhm1.0x0D',
];
