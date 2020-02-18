import * as http from 'http';
import { Server, ServerResponse } from 'http';
import AbstractDetectorDriver from '@double-agent/runner/lib/AbstractDetectorDriver';
import IDirective from '@double-agent/runner/lib/IDirective';
import { agentToDirective, isDirectiveMatch } from '@double-agent/runner/lib/agentHelper';
import { readFileSync } from 'fs';
import csv from 'csv-parse/lib/sync';
import { saveUseragentProfile } from '@double-agent/runner/lib/useragentProfileHelper';
import ICodecProfile from './interfaces/ICodecProfile';
import { findUniqueProfiles, getProfileForUa } from './profiles';

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
    for (const { profile } of profiles) {
      const directive = agentToDirective(profile.useragent);
      this.directives.push({
        ...directive,
        url,
        waitForElementSelector: 'body.complete',
      });
    }

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
      bodyJson.probablyPlays.sort();
      bodyJson.maybePlays.sort();
      bodyJson.recordingFormats.sort();

      if (process.env.GENERATE_PROFILES) {
        saveUseragentProfile(userAgent, bodyJson, __dirname + '/profiles');
      }

      const browserProfile = getProfileForUa(userAgent);

      this.recordResult(
        browserProfile.probablyPlays.toString() === bodyJson.probablyPlays.toString(),
        {
          category: 'Audio Codecs Supported',
          name: 'Audio "Probably" Playback Codecs',
          value: bodyJson.probablyPlays.toString(),
          expected: browserProfile.probablyPlays.toString(),
          useragent: userAgent,
        },
      );

      this.recordResult(browserProfile.maybePlays.toString() === bodyJson.maybePlays.toString(), {
        category: 'Audio Codecs Supported',
        name: 'Audio "Maybe" Playback Codecs',
        value: bodyJson.maybePlays.toString(),
        expected: browserProfile.maybePlays.toString(),
        useragent: userAgent,
      });

      this.recordResult(
        browserProfile.recordingFormats.toString() === bodyJson.recordingFormats.toString(),
        {
          category: 'Audio Codecs Supported',
          name: 'Audio Recording Codecs',
          value: bodyJson.recordingFormats.toString(),
          expected: browserProfile.recordingFormats.toString(),
          useragent: userAgent,
        },
      );

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
<h1>Audio Codecs Analysis</h1>
<h5>Recording Formats</h5>
<pre id="records"></pre>
<h5>Probably Plays</h5>
<pre id="probably-plays"></pre>
<h5>Maybe Plays</h5>
<pre id="maybe-plays"></pre>

</body>
<script type="text/javascript">
const audioMimes = ${JSON.stringify(audioMimes)};
const codecs = ${JSON.stringify(codecs)};
const audioElt = document.createElement('audio');
const recordingFormats = [];
const probablyPlays = [];
const maybePlays = [];
for (const format of audioMimes) {
  {
    const isTypeAllowed = window["MediaRecorder"] && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(format);
    if (isTypeAllowed) recordingFormats.push(format);
    const canPlay = audioElt.canPlayType(format);
    if (canPlay === 'probably') probablyPlays.push(format);
    if (canPlay === 'maybe') maybePlays.push(format);
      
  }

  for (const codec of codecs) {
    const formatPlusCodec= format + ';codecs=' + codec;
    const isTypeAllowed = window["MediaRecorder"] && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(formatPlusCodec);
    if (isTypeAllowed) recordingFormats.push(formatPlusCodec);
    const canPlay = audioElt.canPlayType(formatPlusCodec);
    if (canPlay === 'probably') probablyPlays.push(formatPlusCodec);
    if (canPlay === 'maybe') maybePlays.push(formatPlusCodec);
  }
  
  document.querySelector('#records').innerHTML = recordingFormats.join('\\n');
  document.querySelector('#probably-plays').innerHTML = probablyPlays.join('\\n');
  document.querySelector('#maybe-plays').innerHTML = maybePlays.join('\\n');
  document.querySelector('body').classList.add('complete')
}

recordingFormats.sort();
probablyPlays.sort();
maybePlays.sort();

fetch('/result', {
  method: 'post',
  headers: { 'content-type': 'application/json'},
  body: JSON.stringify({ recordingFormats, probablyPlays, maybePlays })
});

</script>
</html>`);
    res.end();
  }
}

const audioMimeAlternatives = csv(readFileSync(__dirname + '/audio-mimetypes.csv', 'utf8'))
  .slice(1)
  .map(x => x[1].toLowerCase())
  .filter(Boolean);
const applicationMimeAlternatives = csv(
  readFileSync(__dirname + '/application-mimetypes.csv', 'utf8'),
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

const codecs = [
  'pcm',
  'vorbis',
  'opus',
  '1',
  'h264',
  'avc1',
  'avc1.42E01E',
  'mp3',
  'mp4a.40.2',
  'mp4a.40.5',
  'mp4a.69',
  'mp4a.6B',
  'mp4a.40.05',
  'mp4a.a6',
  'ac-3',
  'mp4a.a5',
  'ec-3',
  'mhm1.0x0D',
];
