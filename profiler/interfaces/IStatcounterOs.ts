export default interface IStatcounterOs {
  os: string;
  version: string;
  averagePercent: number;
  matchingUseragents(...useragents: string[]): string[];
}
