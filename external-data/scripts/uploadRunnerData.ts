import * as Fs from 'fs';
import * as Path from 'path';
import { Octokit } from '@octokit/core';
import { createTarGz } from '../lib/createTarGz';

const REPO_OWNER = 'ulixee'
const REPO_NAME = 'double-agent';
const GZ_FILENAME = '1-foundational-probes.tar.gz';

(async function run() {
  const pkgPath = Path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(Fs.readFileSync(pkgPath, 'utf8'));
  const octokit = new Octokit({ auth: process.env.GITHUB_AUTH_TOKEN });
  let uploadUrl;
  let assets: any[];

  try {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/releases/tags/{tag}', {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tag: pkg.version,
    });
    console.log(`FOUND RELEASE ${pkg.version}`);
    uploadUrl = data.upload_url;
    assets = data.assets;
  } catch(e) {
    if (e.message !== 'Not Found') throw e;
    console.log(`CREATING RELEASE ${pkg.version}`);
    const { data } = await octokit.request(`POST /repos/{owner}/{repo}/releases`, {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tag_name: pkg.version,
      name: pkg.version,
    });
    uploadUrl = data.upload_url;
    assets = data.assets;
  }

  const tmpDirPath = Path.resolve(__dirname, '.tmp-upload');
  const gzFilePath = Path.resolve(tmpDirPath, GZ_FILENAME);
  const runnerDir = Path.dirname(require.resolve('@double-agent/runner'));
  const baseFilesDir = Path.resolve(runnerDir, 'data/external/1-foundational-probes');
  const files = [
    ...Fs.readdirSync(`${baseFilesDir}/probe-buckets`).map(x => `probe-buckets/${x}`),
    ...Fs.readdirSync(`${baseFilesDir}/probe-ids`).map(x => `probe-ids/${x}`),
    ...Fs.readdirSync(`${baseFilesDir}/probes`).map(x => `probes/${x}`),
    'layers.json'
  ];

  if (Fs.existsSync(tmpDirPath)) Fs.rmdirSync(tmpDirPath, { recursive: true });
  Fs.mkdirSync(tmpDirPath);
  console.log(`GZIPPING ${GZ_FILENAME}`);
  await createTarGz(gzFilePath, baseFilesDir, files);

  const asset = assets.find(x => x.name === GZ_FILENAME);
  if (asset) {
    console.log(`DELETING ${asset.browser_download_url}`);
    await octokit.request('DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}', {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      asset_id: asset.id,
    })
  }

  console.log(`UPLOADING ${GZ_FILENAME}`);
  const { data } = await octokit.request(`POST ${uploadUrl}`, {
    name: GZ_FILENAME,
    label: GZ_FILENAME,
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
