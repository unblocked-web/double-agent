import * as Fs from 'fs';
import * as Path from 'path';

const uaImportPath = Path.resolve(__dirname, '../../../slab/data/browserstack/useragents.json');
const useragents = JSON.parse(Fs.readFileSync(uaImportPath, 'utf8')).map(x => x.string);

const uaExportPath = Path.resolve(__dirname, '../data/useragents.json');
Fs.writeFileSync(uaExportPath, JSON.stringify(useragents, null, 2));
