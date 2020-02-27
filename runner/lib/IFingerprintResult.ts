import IDirective from './IDirective';

export default interface IFingerprintResult {
  directive: IDirective;
  category: string;
  name: string;
  fingerprints: number;
  fingerprintsMaxSeenPct: number;
  fingerprintDetails: object[];
  omitted?: boolean;
  reason?: string;
}
