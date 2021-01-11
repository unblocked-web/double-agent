/* eslint-disable no-console */
import Queue from 'p-queue';
import IAssignment from '@double-agent/collect-controller/interfaces/IAssignment';
import assignmentServer from './assignmentServer';

interface IConfig {
  userId: string;
  dataDir?: string;
  concurrency?: number;
  beforeFinishFn?: () => Promise<void | unknown> | void;
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
  const { assignments } = await assignmentServer('/create', { userId, dataDir });

  for (const { id: assignmentId } of assignments) {
    queue.add(async () => {
      console.log(`Getting assignment %s of %s`, assignmentId, assignments.length);
      let assignment;
      try {
        const response = await assignmentServer<IAssignment>(`/activate/${assignmentId}`, {userId});
        assignment = response.assignment;
      } catch (error) {
        console.log('ERROR getting assignment: ', error);
        process.exit();
      }
      console.log(
        '[%s._] RUNNING %s assignment (%s)',
        assignment.sessionId,
        assignment.type,
        assignment.id,
      );
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
