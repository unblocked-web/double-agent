import IVisitLimit from './IVisitLimit';

export default interface IVisitAllowance {
  minutes: number;
  limits: IVisitLimit[];
  periodName: string;
}
