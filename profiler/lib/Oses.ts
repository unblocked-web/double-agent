import { Agent } from 'useragent';
import { createOsKey } from './OsGenerator';
import * as Path from 'path';
import * as Fs from 'fs';

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

export interface IOperatingSystem {
  key: string;
  name: string;
  desktopPercent: number;
  version: IOperatingSystemVersion;
}

export interface IOperatingSystemVersion {
  major: string;
  minor: string;
  name?: string;
}

export interface IByKey {
  [key: string]: IOperatingSystem
}
