export default interface IStatcounterBrowser {
  browser: string;
  version: string;
  averagePercent: number;
  matchingUseragents(...useragents: string[]): string[];
}
