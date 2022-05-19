import { IRunnerFactory, IRunner } from '../interfaces/runner';
import forEachAssignment from './forEachAssignment';

interface RunAssignmentsOptions {
  concurrency?: number;
}

async function runFactoryRunners(
  runnerFactory: IRunnerFactory,
  runnerID: string,
  userAgentsToTestPath: string,
  assignmentsDataOutDir: string,
  concurrency: number,
) {
  console.log(`run all assignments for runner: ${runnerID}!`);

  const config = {
    userId: `runner-${runnerID}`,
    dataDir: assignmentsDataOutDir,
    concurrency,
    userAgentsToTestPath,
  };

  await forEachAssignment(config, async (assignment) => {
    let runner: IRunner;
    try {
      runner = await runnerFactory.spawnRunner(assignment);
    } catch (error) {
      console.error(`failed to create runner ${runnerID}`, error);
      return;
    }
    try {
      await runner.run(assignment);
    } catch (error) {
      console.error(`runner ${runnerID} run failed with exception`, error);
    } finally {
      try {
        await runner.stop();
      } catch (error) {
        console.error(`failed to stop runner ${runnerID}`, error);
      }
    }
  });
}

async function runAssignments(
  runnerFactory: IRunnerFactory,
  userAgentsToTestPath: string,
  assignmentsDataOutDir: string,
  options?: RunAssignmentsOptions,
) {
  const DEFAULT_CONCURRENCY = 1;

  if (!options) {
    options = {
      concurrency: DEFAULT_CONCURRENCY,
    };
  } else {
    if (!options.concurrency || options.concurrency <= 0) {
      options.concurrency = DEFAULT_CONCURRENCY;
    }
  }

  const runnerID = runnerFactory.runnerId();

  try {
    await runnerFactory.startFactory();
  } catch (error) {
    console.error(`failed to start runner factory ${runnerID}`, error);
    return;
  }

  try {
    await runFactoryRunners(
      runnerFactory,
      runnerID,
      userAgentsToTestPath,
      assignmentsDataOutDir,
      options.concurrency,
    );
  } catch (error) {
    console.error(`failed to run runners for factory runner with runner Id ${runnerID}`, error);
  } finally {
    try {
      await runnerFactory.stopFactory();
    } catch (error) {
      console.error(`failed to stop runner factory with Id ${runnerID}`, error);
    }
  }
}

export { runAssignments, RunAssignmentsOptions };
