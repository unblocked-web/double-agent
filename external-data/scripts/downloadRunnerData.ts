import * as Fs from 'fs';
import * as Path from 'path';
import { DownloadOptions, downloadRunnerData } from '../lib/downloadRunnerData';

const runnerDir = Path.dirname(require.resolve('@double-agent/runner'));
const foundationalProbesDir = `${runnerDir}/data/external/1-foundational-probes`;

const pkgPath = Path.resolve(__dirname, '../../package.json');
const pkg = JSON.parse(Fs.readFileSync(pkgPath, 'utf8'));
const downloadOptions: DownloadOptions = {
  version: pkg.version,
};

downloadRunnerData(foundationalProbesDir, downloadOptions);
