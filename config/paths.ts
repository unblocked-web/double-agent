import Path from 'path';
import Paths from './paths.json';

export const probesDataDir = Path.resolve(__dirname, Paths['probe-data']);
export const rootDir = Path.resolve(__dirname, Paths.root);
