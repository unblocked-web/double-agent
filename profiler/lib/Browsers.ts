import * as Path from 'path';
import * as Fs from 'fs';
import IBrowserVersion from '../interfaces/IBrowserVersion';
import IBrowser from '../interfaces/IBrowser';

export const FILE_PATH = Path.join(__dirname, '../data/browsers.json');

export default class Browsers {
  private readonly byKey: IByKey;

  constructor() {
    const data = Fs.readFileSync(FILE_PATH, 'utf8');
    this.byKey = JSON.parse(data) as IByKey;
  }

  public getByKey(key: string): IBrowser {
    return this.byKey[key];
  }

  public toArray(): IBrowser[] {
    return Object.values(this.byKey);
  }
}

// INTERFACES

export interface IByKey {
  [key: string]: IBrowser
}
