import { writeUserAgentsToTest } from '@double-agent/runner/lib/collectUserAgentsToTest';

import externalUserAgentConfig from '../data/external/userAgentConfig.json';
import { getExternalDataPath } from '../paths';

const externalUserAgentsToTestDir = getExternalDataPath('/2-user-agents-to-test/userAgentsToTest');

void writeUserAgentsToTest(externalUserAgentConfig, externalUserAgentsToTestDir).catch(
  console.error,
);
