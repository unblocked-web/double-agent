import * as Path from 'path';

import { program } from 'commander';
import { exit } from 'process';

import { runAssignments } from '@double-agent/runner/lib/runAssignments'
import { IRunnerFactory } from '@double-agent/runner/interfaces/runner';

import HeroRunnerFactory from '../lib/HeroRunnerFactory';
import SecretAgentRunnerFactory from '../lib/SecretAgentRunnerFactory';
import PuppeteerRunnerFactory from '../lib/PuppeteerRunnerFactory';

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
const userAgentsToTestPath = Path.join(__dirname, `../data/${TYPE}/2-user-agents-to-test/userAgentsToTest`);
const dataDir = Path.resolve(__dirname, `../data/${TYPE}/3-assignments`);

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

runAssignments(runnerFactory, userAgentsToTestPath, dataDir)
  .then(() => process.exit())
  .catch(console.log);
