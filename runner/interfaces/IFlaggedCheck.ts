import IAsset from './IAsset';

export default interface IFlaggedCheck extends IAsset {
  requestIdx?: number; //index in session
  category: string;
  checkName: string;
  description?: string;
  value: string | number | boolean;
  pctBot: number;
  expected?: string | number | boolean;
  details?: string;
}
