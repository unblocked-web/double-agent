import * as Path from 'path';
import { Agent } from 'secret-agent';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import runAssignmentInSecretAgent from '../lib/runAssignmentInSecretAgent';
import forEachAssignment from '../lib/forEachAssignment';

process.env.SHOW_BROWSER = 'false';
process.env.SA_SHOW_REPLAY = 'false';

(async function run() {
  const runAssignment = async (assignment: IAssignment) => {
    const agent = new Agent({ browserEmulatorId: 'chrome-80' });
    await runAssignmentInSecretAgent(agent, assignment);
    await agent.close();
  }

  const config = { userId: 'testing', dataDir: Path.resolve(__dirname, '../data/3-ran-assignments'), concurrency: 1 };
  await forEachAssignment(config, assignment => runAssignment(assignment));
})().catch(console.log);
