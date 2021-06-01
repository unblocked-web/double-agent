import * as Fs from "fs";
import * as Path from "path";
import Analyze from '@double-agent/analyze';
import { IResultFlag } from '@double-agent/analyze/lib/Plugin';
// import { UserAgentToTestPickType } from '@double-agent/config/interfaces/IUserAgentToTest';
// import { createOverTimeSessionKey } from '@double-agent/collect-controller/lib/buildAllAssignments';

const probesDataDir = Path.resolve(__dirname, `../data/external/1-foundational-probes`);
const assignmentsDataDir = Path.resolve(__dirname, `../data/external/3-assignments`);

const resultsDir = Path.resolve(__dirname, `../data/external/4-assignment-results`);

const userAgentIds = Fs.readdirSync(`${assignmentsDataDir}/individual`);
const analyze = new Analyze(userAgentIds.length, probesDataDir);

for (const userAgentId of userAgentIds) {
  const flags = analyze.addIndividual(`${assignmentsDataDir}/individual`, userAgentId);
  const saveFlagsToDir = Path.resolve(resultsDir, userAgentId);
  saveFlagsToPluginFiles(saveFlagsToDir, flags);
}

// for (const pickType of [UserAgentToTestPickType.popular, UserAgentToTestPickType.random]) {
//   const sessionsDir = Path.resolve(assignmentsDataDir, `overtime-${pickType}`);
//   analyze.addOverTime(sessionsDir, pickType).forEach(({ userAgentId, flags }, i) => {
//     const sessionKey = createOverTimeSessionKey(pickType, i, userAgentId);
//     const flagsDir = Path.resolve(sessionsDir, sessionKey, `flags`);
//     saveFlagsToPluginFiles(flagsDir, flags);
//   });
// }

const testResults = analyze.generateTestResults();
const testResultsPath = Path.resolve(resultsDir, `testResults.json`);
Fs.writeFileSync(testResultsPath, JSON.stringify(testResults, null, 2));

function saveFlagsToPluginFiles(saveToDir: string, flags: IResultFlag[]) {
  const flagsByPluginId: { [pluginId: string]: IResultFlag[] } = {};
  flags.forEach(flag => {
    flagsByPluginId[flag.pluginId] = flagsByPluginId[flag.pluginId] || [];
    flagsByPluginId[flag.pluginId].push(flag);
  });
  if (Fs.existsSync(saveToDir)) Fs.rmdirSync(saveToDir, { recursive: true });
  Fs.mkdirSync(saveToDir, { recursive: true });

  for (const pluginId of Object.keys(flagsByPluginId)) {
    const filePath = Path.resolve(saveToDir, `${pluginId}.json`);
    Fs.writeFileSync(filePath, JSON.stringify(flagsByPluginId[pluginId], null, 2));

    const signaturesFilePath = Path.resolve(saveToDir, `${pluginId}-signatures.json`);
    Fs.writeFileSync(signaturesFilePath, JSON.stringify(flagsByPluginId[pluginId].map(x => x.checkSignature), null, 2));
  }
}
