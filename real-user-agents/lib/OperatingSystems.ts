import * as Path from 'path';
import OperatingSystem from './OperatingSystem';

export const FILE_PATH = Path.join(__dirname, '../data/operatingSystemsById.json');

let BY_ID: IOperatingSystemById;
function load() {
  if (!BY_ID) {
    // eslint-disable-next-line global-require,import/no-dynamic-require
    BY_ID = require(FILE_PATH) as IOperatingSystemById;
    Object.keys(BY_ID).forEach(id => (BY_ID[id] = OperatingSystem.load(BY_ID[id])));
  }
  return BY_ID;
}

export default class OperatingSystems {
  public static all() {
    return Object.values(load());
  }

  public static byId(id: string) {
    return load()[id];
  }
}

interface IOperatingSystemById {
  [id: string]: OperatingSystem;
}
