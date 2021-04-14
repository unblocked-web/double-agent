import * as Path from 'path';
import { Agent } from 'secret-agent';
import ChromeAncient from '@secret-agent/emulate-chrome-ancient';
import Chrome80 from '@secret-agent/emulate-chrome-80';
import Chrome81 from '@secret-agent/emulate-chrome-81';
import Chrome83 from '@secret-agent/emulate-chrome-83';
import Chrome84 from '@secret-agent/emulate-chrome-84';
import Chrome85 from '@secret-agent/emulate-chrome-85';
import Chrome86 from '@secret-agent/emulate-chrome-86';
import Chrome87 from '@secret-agent/emulate-chrome-87';
import Chrome88 from '@secret-agent/emulate-chrome-88';
import Safari13 from '@secret-agent/emulate-safari-13';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import Core from '@secret-agent/core';
import BrowserEmulators from "@secret-agent/core/lib/BrowserEmulators";
import runAssignmentInSecretAgent from '../lib/runAssignmentInSecretAgent';
import forEachAssignment from '../lib/forEachAssignment';

// process.env.SA_SHOW_BROWSER = 'true';
process.env.SA_SHOW_REPLAY = 'false';

BrowserEmulators.load(ChromeAncient);
BrowserEmulators.load(Chrome80);
BrowserEmulators.load(Chrome81);
BrowserEmulators.load(Chrome83);
BrowserEmulators.load(Chrome84);
BrowserEmulators.load(Chrome85);
BrowserEmulators.load(Chrome86);
BrowserEmulators.load(Chrome87);
BrowserEmulators.load(Chrome88);
BrowserEmulators.load(Safari13);

const TYPE = 'external';

(async function run() {
  const coreServerPort = await startCore();
  const connectionToCore = { host: `localhost:${coreServerPort}` };

  const runAssignment = async (assignment: IAssignment) => {
    const agent = new Agent({ connectionToCore, browserEmulatorId: assignment.userAgentString });
    console.log(assignment.userAgentString);
    console.log('AGENT: ', await agent.meta);
    await runAssignmentInSecretAgent(agent as any, assignment);
    await agent.close();
  };
  const userAgentsToTestPath = Path.join(__dirname, `../data/${TYPE}/2-user-agents-to-test/userAgentsToTest`);

  const config = {
    userId: 'testing',
    dataDir: Path.resolve(__dirname, `../data/${TYPE}/3-assignments`),
    concurrency: 1,
    userAgentsToTestPath,
  };
  await forEachAssignment(config, assignment => runAssignment(assignment));
})().then(() => process.exit()).catch(console.log);

async function startCore() {
  Core.onShutdown = () => process.exit();
  const coreServerPort = 7007;
  await Core.start({ coreServerPort });
  return coreServerPort;
}
