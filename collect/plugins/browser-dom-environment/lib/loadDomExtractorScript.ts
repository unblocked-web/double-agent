import PageNames from '../interfaces/PageNames';
import DomExtractor from '../injected-scripts/DomExtractor';

export default function loadDomExtractorScript() {
  return DomExtractor.toString();
}

export interface IDomExtractorPageMeta {
  saveToUrl: string;
  pageUrl: string;
  pageHost: string;
  pageName: keyof typeof PageNames | string;
}
