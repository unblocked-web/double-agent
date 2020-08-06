import * as Path from 'path';
import * as Fs from 'fs';
import IBrowserUseragent from "../interfaces/IBrowserUseragent";

export const FILE_PATH = Path.join(__dirname, '../data/browsersToTest.json');

export default class BrowsersToTest {
  private readonly instances: IBrowserToTest[];

  constructor() {
    const data = Fs.readFileSync(FILE_PATH, 'utf8');
    this.instances = JSON.parse(data) as IBrowserToTest[];
  }

  get all() {
    return this.instances;
  }
}

// INTERFACES

export interface IBrowserToTest {
  browserKey: string;
  osKey: string;
  pickType: IBrowserToTestPickType;
  usagePercent: IBrowserToTestUsagePercent;
  useragents: IBrowserUseragent[];
}

export interface IBrowserToTestUsagePercent {
  majority: number;
  random: number;
}

export type IBrowserToTestPickType = ('majority' | 'random')[];
