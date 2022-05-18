import * as Fs from 'fs';
import * as Path from 'path';
import Config from '../index';

const slabDataDir =
  process.env.SLAB_DATA_DIR || Path.resolve(__dirname, '../../../slab/vault/data');
const slabPathPatternsDir = Path.join(slabDataDir, 'dom-bridges/path-patterns');
const localPathPatternsDir = Path.join(Config.dataDir, 'path-patterns');

export default function updatePathPatterns() {
  if (!Fs.existsSync(localPathPatternsDir)) Fs.mkdirSync(localPathPatternsDir, { recursive: true });

  for (const fileName of Fs.readdirSync(slabPathPatternsDir)) {
    const fromFilePath = Path.join(slabPathPatternsDir, fileName);
    const toFilePath = Path.join(localPathPatternsDir, fileName);
    const data = Fs.readFileSync(fromFilePath, 'utf8');
    Fs.writeFileSync(toFilePath, data);
  }
}
