// LOAD DATA
import * as Path from 'path';
import Browser from './Browser';

export const FILE_PATH = Path.join(__dirname, '../data/browsersById.json');

let BY_ID: IBrowserById;
function load() {
  if (!BY_ID) {
    // eslint-disable-next-line global-require,import/no-dynamic-require
    BY_ID = require(FILE_PATH) as IBrowserById;
    Object.keys(BY_ID).forEach(id => (BY_ID[id] = Browser.load(BY_ID[id])));
  }
  return BY_ID;
}

export default class Browsers {
  public static all() {
    return Object.values(load());
  }

  public static byId(id: string) {
    return load()[id];
  }
}

interface IBrowserById {
  [id: string]: Browser;
}
