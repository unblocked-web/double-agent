import * as Fs from 'fs';
import * as Path from 'path';
import RealUserAgents from "@double-agent/real-user-agents";
import IUserAgentToTest, {UserAgentToTestPickType} from "@double-agent/config/interfaces/IUserAgentToTest";
// import localUserAgentConfig from '../data/local/userAgentConfig.json';
import externalUserAgentConfig from '../data/external/userAgentConfig.json';

const dataDir = Path.join(__dirname, '../data');

// const localBaseDir = `${dataDir}/local`;
// const localUserAgentsToTest = collectUserAgentsToTest(localBaseDir, localUserAgentConfig);
// const localUserAgentsToTestDir = Path.join(__dirname, '../data/local/2-user-agents-to-test/');
// const localUserAgentsToTestPath = Path.join(localUserAgentsToTestDir, 'userAgentsToTest.json');
// if (!Fs.existsSync(localUserAgentsToTestDir)) Fs.mkdirSync(localUserAgentsToTestDir);
// Fs.writeFileSync(localUserAgentsToTestPath, JSON.stringify(localUserAgentsToTest, null, 2));

const externalBaseDir = `${dataDir}/external`;
const externalUserAgentsToTest = collectUserAgentsToTest(externalBaseDir, externalUserAgentConfig);
const externalUserAgentsToTestDir = Path.join(__dirname, '../data/external/2-user-agents-to-test/');
const externalUserAgentsToTestPath = Path.join(externalUserAgentsToTestDir, 'userAgentsToTest.json')
if (!Fs.existsSync(externalUserAgentsToTestDir)) Fs.mkdirSync(externalUserAgentsToTestDir);
Fs.writeFileSync(externalUserAgentsToTestPath, JSON.stringify(externalUserAgentsToTest, null, 2));

// HELPERS

function collectUserAgentsToTest(baseDir: string, userAgentConfig): IUserAgentToTest[] {
  const userAgentsToTest: IUserAgentToTest[] = [];

  const tcpProbeBucketsPath = `${baseDir}/1-foundational-probes/probe-buckets/tcp.json`;
  if (!Fs.existsSync(tcpProbeBucketsPath)) {
    return userAgentsToTest;
  }
  const tcpProbeBuckets = JSON.parse(Fs.readFileSync(tcpProbeBucketsPath, 'utf8'));
  const userAgentIds: Set<string> = new Set();
  tcpProbeBuckets.forEach(probeBucket => {
    probeBucket.userAgentIds.forEach(userAgentId => userAgentIds.add(userAgentId));
  });

  for (const userAgentId of userAgentIds) {
    if (!userAgentConfig.browserIds.some(x => userAgentId.includes(x))) continue;
    const userAgent = RealUserAgents.getId(userAgentId);
    if (!userAgent) throw new Error(`${userAgentId} not supported by RealUserAgents`);

    const userAgentToTest = {
      browserId: userAgent.browserId,
      operatingSystemId: userAgent.operatingSystemId,
      pickTypes: [],
      usagePercent: {
        [UserAgentToTestPickType.popular]: 0,
        [UserAgentToTestPickType.random]: 0,
      },
      string: userAgent.strings[0],
    };

    userAgentsToTest.push(userAgentToTest);
  }

  return userAgentsToTest;
}
