import * as Path from 'path';
import { Agent } from 'secret-agent';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import Core from '@secret-agent/core';
import runAssignmentInSecretAgent from '../lib/runAssignmentInSecretAgent';
import forEachAssignment from '../lib/forEachAssignment';

// process.env.SA_SHOW_BROWSER = 'true';
process.env.SA_SHOW_REPLAY = 'false';

const TYPE = 'external';

(async function run() {
  const coreServerPort = await startCore();
  const connectionToCore = { host: `localhost:${coreServerPort}` };

  const runAssignment = async (assignment: IAssignment) => {
    const agent = new Agent({
      connectionToCore,
      userAgent: assignment.userAgentString,
    });
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
