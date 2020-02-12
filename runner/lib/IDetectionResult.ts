import IDirective from './IDirective';

export default interface IDetectionResult {
  directive: IDirective;
  success: boolean;
  name: string;
  useragent: string;
  category?: string;
  value?: string | number;
  expected?: string | number;
  omitted?: boolean;
  reason?: string;
}
