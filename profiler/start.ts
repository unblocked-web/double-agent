import 'source-map-support/register';
import fs from 'fs';
import path from 'path';
import Profiler from './index';

const profileDir = path.resolve(process.env.INIT_CWD, 'profiles');

const profile = JSON.parse(fs.readFileSync(profileDir + '/_directives.json', 'utf8'));

Profiler(
  profile.name,
  profile.concurrency,
  (agent, profileSubdir) => {
    return fs.existsSync(
      path.resolve(profileDir, profileSubdir ?? '', agent.useragentPath + '--0.json'),
    );
  },
  ...profile.directives,
).catch(console.log);
