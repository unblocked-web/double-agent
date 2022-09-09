import * as Fs from 'fs';
import * as Path from 'path';
import Analyze from '@double-agent/analyze';
import { IResultFlag } from '@double-agent/analyze/lib/Plugin';
import { probesDataDir } from '@double-agent/config/paths';
// import { UserAgentToTestPickType } from '@double-agent/config/interfaces/IUserAgentToTest';
// import { createOverTimeSessionKey } from '@double-agent/collect-controller/lib/buildAllAssignments';

const FsPromises = Fs.promises;

async function analyzeAssignmentResults(assignmentsDataDir: string, resultsDir: string) {
  const userAgentIds = await FsPromises.readdir(`${assignmentsDataDir}/individual`);
  const analyze = new Analyze(userAgentIds.length, probesDataDir);

  for (const userAgentId of userAgentIds) {
    const flags = analyze.addIndividual(`${assignmentsDataDir}/individual`, userAgentId);
    const saveFlagsToDir = Path.resolve(resultsDir, userAgentId);
    await saveFlagsToPluginFiles(saveFlagsToDir, flags);
  }

  // for (const pickType of [UserAgentToTestPickType.popular, UserAgentToTestPickType.random]) {
  //     const sessionsDir = Path.resolve(assignmentsDataDir, `overtime-${pickType}`);
  //     const userAgentIdFlagsMapping = analyze.addOverTime(sessionsDir, pickType);
  //     let i = 0;
  //     for (const userAgentId in Object.keys(userAgentIdFlagsMapping)) {
  //         const flags = userAgentIdFlagsMapping[userAgentId];
  //         const sessionKey = createOverTimeSessionKey(pickType, i, userAgentId);
  //         const flagsDir = Path.resolve(sessionsDir, sessionKey, `flags`);
  //         await saveFlagsToPluginFiles(flagsDir, [flags]);
  //         i++;
  //     }
  // }

  const testResults = analyze.generateTestResults();
  const testResultsPath = Path.resolve(resultsDir, `testResults.json`);
  await FsPromises.writeFile(testResultsPath, JSON.stringify(testResults, null, 2));
}

async function saveFlagsToPluginFiles(saveToDir: string, flags: IResultFlag[]) {
  const flagsByPluginId: { [pluginId: string]: IResultFlag[] } = {};
  flags.forEach((flag) => {
    flagsByPluginId[flag.pluginId] = flagsByPluginId[flag.pluginId] || [];
    flagsByPluginId[flag.pluginId].push(flag);
  });
  await FsPromises.mkdir(saveToDir, { recursive: true });

  for (const pluginId of Object.keys(flagsByPluginId)) {
    const filePath = Path.resolve(saveToDir, `${pluginId}.json`);
    await FsPromises.writeFile(filePath, JSON.stringify(flagsByPluginId[pluginId], null, 2));

    const signaturesFilePath = Path.resolve(saveToDir, `${pluginId}-signatures.json`);
    await FsPromises.writeFile(
      signaturesFilePath,
      JSON.stringify(
        flagsByPluginId[pluginId].map((x) => x.checkSignature),
        null,
        2,
      ),
    );
  }
}

export { analyzeAssignmentResults };
