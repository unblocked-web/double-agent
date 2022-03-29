import * as Fs from 'fs';
import * as Os from 'os';
import { Octokit } from '@octokit/core';
import ProgressBar from 'progress';
import { createGunzip } from 'zlib';
import * as Tar from 'tar';
import downloadFile from '../lib/downloadFile';

const FsPromises = Fs.promises;

interface DownloadOptions {
    version?: string,
}

async function downloadRunnerData(probesOutputDir: string, options?: DownloadOptions) {
    if (!options) {
        options = {
            version: "1.0.1",
        };
    } else {
        if (!options.version) {
            options.version = "1.0.1";
        }
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_AUTH_TOKEN });
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/releases/tags/{tag}', {
        owner: 'ulixee',
        repo: 'double-agent',
        tag: options.version,
    });

    const tmpDirPath = `${Os.tmpdir()}/ulixee/double-agent`;
    const gzFileName = '1-foundational-probes.tar.gz';
    const asset = data.assets.find(x => x.name === gzFileName);
    const downloadUrl = asset.browser_download_url;
    const downloadFilePath = `${tmpDirPath}/${gzFileName}`;

    await FsPromises.mkdir(probesOutputDir, { recursive: true });
    await FsPromises.mkdir(tmpDirPath, { recursive: true });

    let progressBar: ProgressBar = null;
    let lastDownloadedBytes = 0;

    await downloadFile(downloadUrl, downloadFilePath, (downloadedBytes, totalBytes) => {
        if (!progressBar) {
            const mb = totalBytes / 1024 / 1024;
            const mbString = `${Math.round(mb * 10) / 10} Mb`;
            progressBar = new ProgressBar(
                `Downloading ${gzFileName} - ${mbString} [:bar] :percent :etas `,
                {
                    complete: '=',
                    incomplete: ' ',
                    width: 20,
                    total: totalBytes,
                },
            );
        }
        const delta = downloadedBytes - lastDownloadedBytes;
        lastDownloadedBytes = downloadedBytes;
        progressBar.tick(delta);
    });

    await new Promise(resolve => {
        Fs.createReadStream(downloadFilePath)
            .pipe(createGunzip())
            .pipe(
                Tar.extract({
                    cwd: probesOutputDir,
                }),
            )
            .on('finish', resolve);
    });

    await FsPromises.rm(tmpDirPath, { recursive: true });
}

export {
    downloadRunnerData,
    DownloadOptions,
};
