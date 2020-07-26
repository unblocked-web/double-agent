import IAssignment from './IAssignment';

export default interface IDetectionResult {
  assignment: IAssignment;
  success: boolean;
  category: string;
  name?: string;
  useragent?: string;
  value?: string | number;
  expected?: string | number;
  omitted?: boolean;
  reason?: string;
}
