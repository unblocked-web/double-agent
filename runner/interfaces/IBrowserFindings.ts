import IFlaggedCheck from './IFlaggedCheck';

export default interface IBrowserFindings {
  [browser: string]: {
    [category: string]: ICategoryResults;
  };
}

export interface ICategoryResults {
  checks: number;
  flagged: number;
  botPct: number;
  flaggedChecks: IFlaggedCheck[];
}

export interface IBrowserPercents {
  browser: string;
  percentUsed: number;
  agentStrings: number;
}
