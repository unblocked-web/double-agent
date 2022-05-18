import * as Path from 'path';

import { writeUserAgentsToTest } from '@double-agent/runner/lib/collectUserAgentsToTest';

import externalUserAgentConfig from '../data/external/userAgentConfig.json';

const dataDir = Path.join(__dirname, '../data');
const externalBaseDir = `${dataDir}/external`;
const externalUserAgentsToTestDir = Path.join(externalBaseDir, '/2-user-agents-to-test/');
const tcpProbeBucketsPath = `${externalBaseDir}/1-foundational-probes/probe-buckets/tcp.json`;

void writeUserAgentsToTest(
  tcpProbeBucketsPath,
  externalUserAgentConfig,
  externalUserAgentsToTestDir,
).catch(console.error);
