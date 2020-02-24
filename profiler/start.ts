import 'source-map-support/register';
import fs from 'fs';
import path from 'path';
import Profiler from './index';

let profileDir = path.resolve(process.env.INIT_CWD, 'profiles');

if (process.argv.length > 2) {
  profileDir = path.resolve(__dirname, '../detections', process.argv[2], 'profiles');
}
console.log('Profiling ', profileDir.split('/').slice(-3).join('/'))

const profile = JSON.parse(fs.readFileSync(profileDir + '/_directives.json', 'utf8'));

Profiler(
  profile.name,
  profile.concurrency,
  (agent, profileSubdir) => {
    if (process.env.REGENERATE) return false;
    return fs.existsSync(
      path.resolve(profileDir, profileSubdir ?? '', agent.useragentPath + '--0.json'),
    );
  },
  ...profile.directives,
).catch(console.log);
