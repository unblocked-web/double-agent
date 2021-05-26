/* eslint-disable no-console */
import Queue from 'p-queue';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import assignmentServer from './assignmentServer';

interface IConfig {
  userId: string;
  dataDir?: string;
  concurrency?: number;
  beforeFinishFn?: () => Promise<void | unknown> | void;
  userAgentsToTestPath?: string;
}

export { IAssignment };

export default async function forEachAssignment(
  config: IConfig,
  runAssignmentFn: (assignment: IAssignment) => Promise<void> | void,
) {
  const concurrency = config.concurrency || 5;
  const queue = new Queue({ concurrency });

  const dataDir = config.dataDir;
  const userId = config.userId;
  const userAgentsToTestPath = config.userAgentsToTestPath;
  const { assignments } = await assignmentServer('/create', { userId, dataDir, userAgentsToTestPath });

  for (const i in assignments) {
    const { id: assignmentId } = assignments[i];
    queue.add(async () => {
      console.log(`Getting assignment %s of %s`, i, assignments.length);
      let assignment;
      try {
        type T = { assignment: IAssignment };
        const response = await assignmentServer<T>(`/activate/${assignmentId}`, {userId});
        assignment = response.assignment;
      } catch (error) {
        console.log('ERROR activating assignment: ', error);
        process.exit();
      }
      console.log('[%s._] RUNNING %s assignment (%s)', assignment.num, assignment.type, assignment.id);
      try {
        await runAssignmentFn(assignment);
      } catch (error) {
        console.log('ERROR running assignment: ', error);
        process.exit();
      }
    });
  }

  await queue.onIdle();
  if (config.beforeFinishFn) await config.beforeFinishFn();
  await assignmentServer('/finish', { userId });
  console.log('FINISHED');
}
