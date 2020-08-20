import * as Fs from 'fs';
import * as Path from 'path';
import IBaseProfile from '@double-agent/collect/interfaces/IBaseProfile';
import {
  UserAgentToTestPickType,
  IUserAgentToTestPickType,
} from '@double-agent/config/interfaces/IUserAgentToTest';
import getAllPlugins from './lib/getAllPlugins';
import Plugin, { IResultFlag } from './lib/Plugin';
import Probe from './lib/Probe';
import ProbeBucket from './lib/ProbeBucket';
import Layer from './lib/Layer';

const dataDir = Path.resolve(__dirname, './data');

interface IResult {
  useragentId: string;
  flags: IResultFlag[];
}

interface IResultsMap {
  byUseragentId: {
    [useragentId: string]: IResultFlag[];
  };
  byPickType: {
    // @ts-ignore
    [UserAgentToTestPickType.popular]: IResult[];
    // @ts-ignore
    [UserAgentToTestPickType.random]: IResult[];
  };
}

export default class Analyze {
  public plugins: Plugin[] = [];

  private readonly profileCountOverTime: number;
  private resultsMap: IResultsMap = {
    byUseragentId: {},
    byPickType: {
      [UserAgentToTestPickType.popular]: [],
      [UserAgentToTestPickType.random]: [],
    },
  };

  constructor(profileCountOverTime: number) {
    this.profileCountOverTime = profileCountOverTime;
    this.plugins = loadAllPlugins();
  }

  public addIndividual(individualsDir: string, useragentId: string) {
    this.resultsMap.byUseragentId[useragentId] = [];

    for (const plugin of this.plugins) {
      const profilePath = Path.join(individualsDir, useragentId, 'raw-data', `${plugin.id}.json`);
      if (!Fs.existsSync(profilePath)) continue;
      const profile = JSON.parse(Fs.readFileSync(profilePath, 'utf-8')) as IBaseProfile;

      if (plugin.runIndividual) {
        const flags = plugin.runIndividual(profile);
        this.resultsMap.byUseragentId[useragentId].push(...flags);
      }
    }

    return this.resultsMap.byUseragentId[useragentId];
  }

  public addOverTime(sessionsDir: string, pickType: IUserAgentToTestPickType) {
    const plugins = loadAllPlugins();
    const dirNames = Fs.readdirSync(sessionsDir)
      .filter(x => x.startsWith(pickType))
      .sort();

    for (const dirName of dirNames) {
      const useragentId = dirName.match(/^[^:]+:(.+)$/)[1];
      const flags: IResultFlag[] = [];
      for (const plugin of plugins) {
        const profilePath = Path.join(sessionsDir, dirName, 'raw-data', `${plugin.id}.json`);
        if (!Fs.existsSync(profilePath)) continue;
        const profile = JSON.parse(Fs.readFileSync(profilePath, 'utf-8')) as IBaseProfile;

        if (plugin.runOverTime) {
          flags.push(...plugin.runOverTime(profile, dirNames.length));
        }
      }
      this.resultsMap.byPickType[pickType].push({ useragentId, flags });
    }

    return this.resultsMap.byPickType[pickType];
  }

  public generateTestResults() {
    const humanScoreMap = {
      total: {
        [UserAgentToTestPickType.popular]: 0,
        [UserAgentToTestPickType.random]: 0,
      },
      individualByUseragentId: {},
      sessionsByPickType: {
        [UserAgentToTestPickType.popular]: [],
        [UserAgentToTestPickType.random]: [],
      },
    };

    for (const useragentId of Object.keys(this.resultsMap.byUseragentId)) {
      const humanScore = this.resultsMap.byUseragentId[useragentId].reduce((score, flag) => {
        return Math.min(score, flag.humanScore);
      }, 0);
      humanScoreMap.individualByUseragentId[useragentId] = humanScore;
    }

    const pickTypes = [UserAgentToTestPickType.popular, UserAgentToTestPickType.random];
    for (const pickType of pickTypes) {
      const sessionDetails = [];
      for (const sessionResult of this.resultsMap.byPickType[pickType]) {
        const { useragentId, flags } = sessionResult;
        const humanScoreIndividual = humanScoreMap.individualByUseragentId[useragentId];
        const humanScoreOverTime = flags.reduce(
          (score, flag) => Math.min(score, flag.humanScore),
          0,
        );
        let humanScoreTotal = humanScoreIndividual + humanScoreOverTime / 2;
        if (humanScoreTotal > 100) humanScoreTotal = 100;
        sessionDetails.push({
          useragentId,
          humanScore: {
            individual: humanScoreIndividual,
            overTime: humanScoreOverTime,
            total: humanScoreTotal,
          },
        });
      }
      humanScoreMap.sessionsByPickType[pickType] = sessionDetails;
      humanScoreMap.total[pickType] = sessionDetails
        .map(x => x.humanScore.total)
        .reduce((a, b) => Math.max(a, b), 0);
    }

    return humanScoreMap;
  }
}

function loadAllPlugins() {
  const plugins = getAllPlugins();
  for (const plugin of plugins) {
    const layersPath = Path.join(dataDir, 'layers.json');
    const probesPath = Path.join(dataDir, 'probes', `${plugin.id}.json`);
    const probeBucketsPath = Path.join(dataDir, 'probe-buckets', `${plugin.id}.json`);

    const probesById: { [id: string]: Probe } = {};
    const probeObjs = JSON.parse(Fs.readFileSync(probesPath, 'utf-8'));
    probeObjs.forEach(probeObj => {
      probesById[probeObj.id] = Probe.load(probeObj, plugin.id);
    });

    const probeBucketObjs = JSON.parse(Fs.readFileSync(probeBucketsPath, 'utf-8'));
    plugin.probeBuckets = probeBucketObjs.map(obj => {
      return ProbeBucket.load(obj, probesById);
    });

    const layerObjs = JSON.parse(Fs.readFileSync(layersPath, 'utf-8')).filter(
      x => x.pluginId === plugin.id,
    );
    plugin.layers = layerObjs.map(obj => Layer.load(obj));
  }
  return plugins;
}
