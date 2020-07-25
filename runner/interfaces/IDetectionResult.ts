import IInstruction from './IInstruction';

export default interface IDetectionResult {
  instruction: IInstruction;
  success: boolean;
  category: string;
  name?: string;
  useragent?: string;
  value?: string | number;
  expected?: string | number;
  omitted?: boolean;
  reason?: string;
}
