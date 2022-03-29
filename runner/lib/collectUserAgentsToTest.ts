import * as Fs from 'fs';
import * as Path from 'path';

import RealUserAgents from "@double-agent/real-user-agents";
import IUserAgentToTest, { UserAgentToTestPickType } from "@double-agent/config/interfaces/IUserAgentToTest";

import { UserAgentConfig } from '../interfaces/userAgent';

const FsPromises = Fs.promises;

async function writeUserAgentsToTest(probeTcpFilePath: string, userAgentConfig: UserAgentConfig, outFilePath: string) {
    const userAgentsToTest = await collectUserAgentsToTest(probeTcpFilePath, userAgentConfig);

    const outDir = Path.dirname(outFilePath);
    await FsPromises.mkdir(outDir, { recursive: true });

    await FsPromises.writeFile(`${outFilePath}.json`, JSON.stringify(userAgentsToTest, null, 2));
}

async function collectUserAgentsToTest(probeTcpFilePath: string, userAgentConfig: UserAgentConfig): Promise<IUserAgentToTest[]> {
    const userAgentsToTest: IUserAgentToTest[] = [];

    if (!(await exists(probeTcpFilePath))) {
        return userAgentsToTest;
    }

    const tcpProbeBuckets = JSON.parse(await FsPromises.readFile(probeTcpFilePath, 'utf8'));
    const userAgentIds: Set<string> = new Set();
    tcpProbeBuckets.forEach(probeBucket => {
        probeBucket.userAgentIds.forEach(userAgentId => userAgentIds.add(userAgentId));
    });

    for (const userAgentId of userAgentIds) {
        if (!userAgentConfig.browserIds.some(x => userAgentId.includes(x))) {
            continue;
        }

        const userAgent = RealUserAgents.getId(userAgentId);
        if (!userAgent) {
            throw new Error(`${userAgentId} not supported by RealUserAgents`);
        }

        const userAgentToTest = {
            browserId: userAgent.browserId,
            operatingSystemId: userAgent.operatingSystemId,
            pickTypes: [],
            usagePercent: {
                [UserAgentToTestPickType.popular]: 0,
                [UserAgentToTestPickType.random]: 0,
            },
            string: userAgent.strings[0],
        };

        userAgentsToTest.push(userAgentToTest);
    }

    return userAgentsToTest;
}

async function exists(path: string): Promise<boolean> {
    try {
        await FsPromises.access(path);
        return true;
    } catch {
        return false;
    }
}

export {
    writeUserAgentsToTest,
    collectUserAgentsToTest,
};
