import * as Fs from 'fs';
import * as Path from 'path';

import RealUserAgents from "@double-agent/real-user-agents";

import { UserAgentConfig } from '../interfaces/userAgent';

const FsPromises = Fs.promises;

interface CollectFoundationalProfilesOptions {
    slabDataDir?: string;
}

async function importSlabProfiles(profilesDir: string, userAgentConfig: UserAgentConfig, options: CollectFoundationalProfilesOptions) {
    let slabDataDir = process.env.SLAB_DATA_DIR;
    if (!slabDataDir) {
        if (options && options.slabDataDir) {
            slabDataDir = options.slabDataDir;
        } else {
            throw 'no slab data dir defined in options or env, while it is required for collecting foundational profiles from';
        }
    }
    const slabProfilesDir = Path.join(slabDataDir, 'profiles');

    for (const userAgentId of await FsPromises.readdir(slabProfilesDir)) {
        if (!userAgentConfig.browserIds.some(x => userAgentId.includes(x))) {
            continue;
        }

        const userAgent = RealUserAgents.getId(userAgentId);
        if (!userAgent) {
            throw new Error(`${userAgentId} not supported by RealUserAgents`);
        }

        const fromDir = `${slabProfilesDir}/${userAgentId}`;
        const toDir = `${profilesDir}/${userAgentId}`
        await copyDir(fromDir, toDir);
    }
}

async function copyDir(fromDir: string, toDir: string) {
    const fileNamesToCopy = await FsPromises.readdir(fromDir);
    await FsPromises.mkdir(toDir, { recursive: true });

    for (const fileNameToCopy of fileNamesToCopy) {
        await FsPromises.copyFile(`${fromDir}/${fileNameToCopy}`, `${toDir}/${fileNameToCopy}`);
    }
}

export { CollectFoundationalProfilesOptions, importSlabProfiles };