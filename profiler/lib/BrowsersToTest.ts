import * as Path from 'path';
import * as Fs from 'fs';

export const FILE_PATH = Path.join(__dirname, '../data/browsersToTest.json');

export default class BrowsersToTest {
  private readonly byType: IByType;

  constructor() {
    const data = Fs.readFileSync(FILE_PATH, 'utf8');
    this.byType = JSON.parse(data) as IByType;
  }

  get majority() {
    return this.byType.majority;
  }

  get intoli() {
    return this.byType.intoli;
  }
}

// INTERFACES

export interface IBrowserToTest {
  browserKey: string;
  osKey: string;
  agents: IBrowserToTestAgent[];
}

export interface IBrowserToTestAgent {
  useragent: string;
  usagePercent: number;
}

export interface IByType {
  majority: IBrowserToTest[];
  intoli: IBrowserToTest[];
}
