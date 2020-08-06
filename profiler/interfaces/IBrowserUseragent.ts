export default interface IBrowserUseragent {
  string: string;
  sources: IBrowserUseragentSource[];
}

export type IBrowserUseragentSource = 'BrowserStack' | 'Intoli';
