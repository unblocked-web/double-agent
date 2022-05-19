import Path from 'path';
import Paths from './paths.json';

export const externalDataDir = Path.resolve(__dirname, Paths['external-data']);

export function getExternalDataPath(path: string): string {
  return Path.join(externalDataDir, path);
}
