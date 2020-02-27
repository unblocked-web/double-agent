import IDetectionResult from './IDetectionResult';
import IDirective from './IDirective';
import IFingerprintResult from './IFingerprintResult';

export default interface IDetectionDriver {
  start: (getPort: () => number) => Promise<void>;
  nextDirective: () => Promise<IDirective | null>;
  getResults: () => IDetectionResult[];
  getFingerprints: () => IFingerprintResult[];
  etcHostEntries: string[];
  readonly testCategories: string[];
}
