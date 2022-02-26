import * as Path from 'path';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import Core from '@ulixee/hero-core';
import Hero from '@ulixee/hero-fullstack';
import RealUserAgents from '@double-agent/real-user-agents';
import runAssignmentInHero from '../lib/runAssignmentInHero';
import forEachAssignment from '../lib/forEachAssignment';

// process.env.SA_SHOW_BROWSER = 'true';
process.env.SA_SHOW_REPLAY = 'false';

const TYPE = 'external';

(async function run() {
  await Core.start();

  const runAssignment = async (assignment: IAssignment) => {
    const agentMeta = RealUserAgents.extractMetaFromUserAgentId(assignment.userAgentId);

    const agent = new Hero({
      userAgent: `~ ${agentMeta.operatingSystemName} = ${agentMeta.operatingSystemVersion.replace(
        '-',
        '.',
      )} & ${agentMeta.browserName} = ${agentMeta.browserVersion.replace('-0', '')}`,
    });
    console.log(assignment.userAgentString);
    console.log('AGENT: ', await agent.meta);
    await runAssignmentInHero(agent as any, assignment);
    await agent.close();
  };
  const userAgentsToTestPath = Path.join(
    __dirname,
    `../data/${TYPE}/2-user-agents-to-test/userAgentsToTest`,
  );

  const config = {
    userId: 'testing',
    dataDir: Path.resolve(__dirname, `../data/${TYPE}/3-assignments`),
    concurrency: 1,
    userAgentsToTestPath,
  };
  await forEachAssignment(config, assignment => runAssignment(assignment));
})()
  .then(() => process.exit())
  .catch(console.log);
