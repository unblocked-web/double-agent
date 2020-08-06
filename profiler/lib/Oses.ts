import * as Fs from 'fs';
import * as Path from 'path';
import IOperatingSystem from '../interfaces/IOperatingSystem';

export const FILE_PATH = Path.join(__dirname, '../data/oses.json');

export default class Oses {
  private readonly byKey: IByKey;

  constructor() {
    const data = Fs.readFileSync(FILE_PATH, 'utf8');
    this.byKey = JSON.parse(data) as IByKey;
  }

  public getByKey(key: string): IOperatingSystem {
    return this.byKey[key];
  }
}

// INTERFACES

export interface IByKey {
  [key: string]: IOperatingSystem
}
