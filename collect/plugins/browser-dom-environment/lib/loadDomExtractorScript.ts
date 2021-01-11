import * as Fs from 'fs';
import * as Path from 'path';
import PageNames from "../interfaces/PageNames";

const scriptPath = Path.resolve(__dirname, '../injected-scripts/domExtractor.js');

export default function loadDomExtractorScript() {
  return Fs.readFileSync(scriptPath, 'utf8');
}

export interface IDomExtractorPageMeta {
  saveToUrl: string;
  pageUrl: string;
  pageHost: string;
  pageName: keyof typeof PageNames | string;
}
