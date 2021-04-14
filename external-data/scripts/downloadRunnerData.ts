import * as Fs from 'fs';
import * as Path from 'path';
import { Octokit } from '@octokit/core';
import ProgressBar from 'progress';
import { createGunzip } from 'zlib';
import * as Tar from 'tar';
import downloadFile from '../lib/downloadFile';

(async function run() {
  const pkgPath = Path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(Fs.readFileSync(pkgPath, 'utf8'));
  const octokit = new Octokit({ auth: process.env.GITHUB_AUTH_TOKEN });

  const { data } = await octokit.request('GET /repos/{owner}/{repo}/releases/tags/{tag}', {
    owner: 'ulixee',
    repo: 'double-agent',
    tag: pkg.version,
  });

  const tmpDirPath = Path.resolve(__dirname, '../.tmp-upload');
  const gzFileName = '1-foundational-probes.tar.gz';
  const asset = data.assets.find(x => x.name === gzFileName);
  const downloadUrl = asset.browser_download_url;
  const downloadFilePath = `${tmpDirPath}/${gzFileName}`;
  const runnerDir = Path.dirname(require.resolve('@double-agent/runner'));
  const foundationalProbesDir = `${runnerDir}/data/external/1-foundational-probes`;

  if (!Fs.existsSync(foundationalProbesDir)) {
    Fs.mkdirSync(foundationalProbesDir);
  }

  if (!Fs.existsSync(tmpDirPath)) {
    Fs.mkdirSync(tmpDirPath);
  }

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
          cwd: foundationalProbesDir,
        }),
      )
      .on('finish', resolve);
  });

  Fs.rmdirSync(tmpDirPath, { recursive: true });
})().catch(e => console.log(e));
