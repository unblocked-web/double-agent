import IDirective from './IDirective';

export default interface IDetectionResult {
  directive: IDirective;
  success: boolean;
  category: string;
  name?: string;
  useragent?: string;
  value?: string | number;
  expected?: string | number;
  omitted?: boolean;
  reason?: string;
}
