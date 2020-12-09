import { AssignmentType } from '@double-agent/runner/interfaces/IAssignment';
import Collect from './index';

async function run() {
  const collect = new Collect();
  const session = await collect.createSession(AssignmentType.Individual);

  console.log('PLUGINS: ', JSON.stringify(session.generatePages(), null, 2));
}

run().catch(error => console.log(error));
