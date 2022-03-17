import * as Path from 'path';
import HeroRunnerFactory from '../lib/HeroRunnerFactory';
import SecretAgentRunnerFactory from '../lib/SecretAgentRunnerFactory';
import PuppeteerRunnerFactory from '../lib/PuppeteerRunnerFactory';
import forEachAssignment from '../lib/forEachAssignment';
import { IRunnerFactory, IRunner } from '../interfaces/runner';
import { program } from 'commander';
import { exit } from 'process';

// RunnerId groups together all supported runner implementations.
enum RunnerId {
  Puppeteer = 'puppeteer',
  SecretAgent = 'secret-agent',
  Hero = 'hero',
}

function parseRunnerID(value: string, previous: RunnerId): RunnerId {
  switch (value.toLowerCase().trim()) {
    case "hero": {
      return RunnerId.Hero;
    }

    case "secret-agent":
    case "secretagent":
    case "sa": {
      return RunnerId.SecretAgent;
    }

    case "puppeteer":
    case "pptr": {
      return RunnerId.Puppeteer;
    }

    default: {
      console.warn(`parseRunnerID: ignore unrecognized runner value: '${value}'`);
      return previous;
    }
  }
}

function parseNumber(value: string): number {
  return parseInt(value);
}

program
  .option('-r, --runner <hero|sa|secret-agent|pptr|puppeteer>', 'select the runner to run', parseRunnerID, RunnerId.Hero)
  .option('--secret-agent-port <port>', 'select port to use for secret agent (flag only used if secret agent runner is selected)', parseNumber, 7007);
program.parse();
const options = program.opts();

// process.env.SA_SHOW_BROWSER = 'true';
process.env.SA_SHOW_REPLAY = 'false';

const TYPE = 'external';

async function runFactoryRunners(runnerID: RunnerId, runnerFactory: IRunnerFactory) {
  console.log(`run all assignments for runner: ${runnerID}!`);

  const userAgentsToTestPath = Path.join(__dirname, `../data/${TYPE}/2-user-agents-to-test/userAgentsToTest`);
  const config = {
    userId: `runner-${runnerID}`,
    dataDir: Path.resolve(__dirname, `../data/${TYPE}/3-assignments`),
    concurrency: 1,
    userAgentsToTestPath,
  };

  await forEachAssignment(config, async (assignment) => {
    let runner: IRunner;
    try {
      runner = await runnerFactory.spawnRunner(assignment);
    } catch (error) {
      console.error(`failed to create runner ${runnerID}: ${error}`);
      return;
    }
    try {
      await runner.run(assignment);
    } catch (error) {
      console.error(`runner ${runnerID} run failed with exception: ${error}`);
    } finally {
      try {
        await runner.stop();
      } catch (error) {
        console.error(`failed to stop runner ${runnerID}: ${error}`);
      }
    }
  });
}

async function run() {
  const runnerId = options.runner || RunnerId.Puppeteer;
  let runnerFactory: IRunnerFactory;

  switch (runnerId) {
    case RunnerId.Puppeteer: {
      runnerFactory = new PuppeteerRunnerFactory();
      break;
    }

    case RunnerId.SecretAgent: {
      runnerFactory = new SecretAgentRunnerFactory(options.secretAgentPort);
      break;
    }

    case RunnerId.Hero: {
      runnerFactory = new HeroRunnerFactory();
      break;
    }

    default:
      console.error(`ignoring runner with id ${runnerId}: unsupported`);
      exit(1);
  }

  try {
    await runnerFactory.startFactory();
  } catch (error) {
    console.error(`failed to start runner factory ${runnerId}: ${error}`);
    return;
  }

  try {
    await runFactoryRunners(runnerId, runnerFactory);
  } catch (error) {
    console.error(`failed to run runners for factory runner with runner Id ${runnerId}: ${error}`);
  } finally {
    try {
      await runnerFactory.stopFactory();
    } catch (error) {
      console.error(`failed to stop runner factory with Id ${runnerId}: ${error}`);
    }
  }
}

run().then(() => process.exit()).catch(console.log);
