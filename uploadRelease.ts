import * as Fs from 'fs';
import * as Path from 'path';
import { Octokit } from '@octokit/core';
import { createTarGz } from './external-data/lib/createTarGz';
import pkg from './package.json';

(async function run() {
  const octokit = new Octokit({ auth: process.env.GITHUB_AUTH_TOKEN });
  let uploadUrl;
  let assets: any[];

  try {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/releases/tags/{tag}', {
      owner: 'ulixee',
      repo: 'double-agent',
      tag: pkg.version,
    });
    console.log(`FOUND RELEASE ${pkg.version}`);
    uploadUrl = data.upload_url;
    assets = data.assets;
  } catch(e) {
    if (e.message !== 'Not Found') throw e;
    console.log(`CREATING RELEASE ${pkg.version}`);
    const { data } = await octokit.request('POST /repos/ulixee/double-agent/releases', {
      owner: 'ulixee',
      repo: 'double-agent',
      tag_name: pkg.version,
      name: pkg.version,
    });
    uploadUrl = data.upload_url;
    assets = data.assets;
  }

  const tmpDirPath = Path.resolve(__dirname, '.tmp-upload');
  const gzFileName = '1-foundational-probes.tar.gz';
  const gzFilePath = Path.resolve(tmpDirPath, gzFileName);
  const baseFilesDir = Path.resolve(__dirname, 'runner/data/external/1-foundational-probes');
  const files = [
    ...Fs.readdirSync(`${baseFilesDir}/probe-buckets`).map(x => `probe-buckets/${x}`),
    ...Fs.readdirSync(`${baseFilesDir}/probe-ids`).map(x => `probe-ids/${x}`),
    ...Fs.readdirSync(`${baseFilesDir}/probes`).map(x => `probes/${x}`),
    'layers.json'
  ];

  if (Fs.existsSync(tmpDirPath)) Fs.rmdirSync(tmpDirPath, { recursive: true });
  Fs.mkdirSync(tmpDirPath);
  console.log(`GZIPPING ${gzFileName}`);
  await createTarGz(gzFilePath, baseFilesDir, files);

  const asset = assets.find(x => x.name === gzFileName);
  if (asset) {
    console.log(`DELETING ${asset.browser_download_url}`);
    await octokit.request('DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}', {
      owner: 'ulixee',
      repo: 'double-agent',
      asset_id: asset.id,
    })
  }

  console.log(`UPLOADING ${gzFileName}`);
  const { data } = await octokit.request(`POST ${uploadUrl}`, {
    name: gzFileName,
    label: gzFileName,
    data: Fs.createReadStream(gzFilePath) as any,
    headers: {
      'content-type': 'application/gzip',
      'content-length': Fs.statSync(gzFilePath).size,
    },
  });
  const downloadUrl = data.browser_download_url;
  Fs.rmdirSync(tmpDirPath, { recursive: true });

  console.log('DONE', downloadUrl);
})().catch(e => console.log(e));
