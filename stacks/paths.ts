import * as Path from 'path';
import * as Paths from './paths.json';

export const externalDataDir = Path.resolve(__dirname, Paths['external-data']);

export function getExternalDataPath(path: string): string {
  return Path.join(externalDataDir, path);
}
