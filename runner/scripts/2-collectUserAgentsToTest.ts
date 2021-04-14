import * as Fs from 'fs';
import * as Path from 'path';
import RealUserAgents from "@double-agent/real-user-agents";
import IUserAgentToTest, {UserAgentToTestPickType} from "@double-agent/config/interfaces/IUserAgentToTest";
import localUserAgentConfig from '../data/local/userAgentConfig.json';
import externalUserAgentConfig from '../data/external/userAgentConfig.json';

const dataDir = Path.join(__dirname, '../data');

const localProfilesDir = `${dataDir}/local/0-foundational-profiles`;
const localUserAgentsToTest = collectUserAgentsToTest(localProfilesDir, localUserAgentConfig);
const localUserAgentsToTestPath = Path.join(__dirname, '../data/local/2-user-agents-to-test/userAgentsToTest.json');
Fs.writeFileSync(localUserAgentsToTestPath, JSON.stringify(localUserAgentsToTest, null, 2));

const externalProfilesDir = `${dataDir}/external/0-foundational-profiles`;
const externalUserAgentsToTest = collectUserAgentsToTest(externalProfilesDir, externalUserAgentConfig);
const externalUserAgentsToTestPath = Path.join(__dirname, '../data/external/2-user-agents-to-test/userAgentsToTest.json');
Fs.writeFileSync(externalUserAgentsToTestPath, JSON.stringify(externalUserAgentsToTest, null, 2));

// HELPERS

function collectUserAgentsToTest(profilesDir: string, userAgentConfig): IUserAgentToTest[] {
  const userAgentsToTest: IUserAgentToTest[] = [];

  for (const userAgentId of Fs.readdirSync(profilesDir)) {
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
