import * as Path from 'path';
import IUserAgentToTest from '../interfaces/IUserAgentToTest';

export const FILE_PATH = Path.join(__dirname, '../data/userAgentsToTest.json');

let INSTANCES: IUserAgentToTest[];
function load() {
  if (!INSTANCES) {
    // eslint-disable-next-line global-require,import/no-dynamic-require
    INSTANCES = require(FILE_PATH) as IUserAgentToTest[];
  }
  return INSTANCES;
}

export default class UserAgentsToTest {
  public static all() {
    return [...load()];
  }
}
