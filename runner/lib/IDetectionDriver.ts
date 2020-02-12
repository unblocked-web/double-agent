import IDetectionResult from './IDetectionResult';
import IDirective from './IDirective';

export default interface IDetectionDriver {
  start: (getPort: () => number) => Promise<void>;
  nextDirective: () => Promise<IDirective | null>;
  getResults: () => IDetectionResult[];
  etcHostEntries: string[];
}
