import * as Path from 'path';
import { extractFoundationalProbes } from '@double-agent/runner/lib/extractFoundationalProbes';

const dataDir = Path.resolve(__dirname, '../data');
const foundationalProfilesDir = Path.resolve(dataDir, 'external/0-foundational-profiles');
const foundationalProbesDir = Path.resolve(dataDir, 'external/1-foundational-probes');

extractFoundationalProbes(foundationalProfilesDir, foundationalProbesDir).catch(console.log);
