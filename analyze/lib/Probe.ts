import * as Path from 'path';
import BaseCheck, { ICheckType } from './checks/BaseCheck';

const COUNTER_START = 18278;
const counterByPrefix: { [prefix: string]: number } = {};

export default class Probe {
  public id: string;
  public checkName: string;
  public checkType: ICheckType;
  public path: string;
  public args: any[];

  private readonly pluginId: string;
  private _check: BaseCheck;

  constructor(
    id: string,
    checkName: string,
    checkType: ICheckType,
    path: string,
    args: any[],
    pluginId: string,
  ) {
    this.id = id;
    this.checkName = checkName;
    this.checkType = checkType;
    this.path = path;
    this.args = args;
    this.pluginId = pluginId;
  }

  public get check() {
    if (!this._check) {
      const checksDir = Path.resolve(__dirname, `checks`);
      const pluginChecksDir = Path.resolve(__dirname, `../plugins/${this.pluginId}/lib/checks`);
      let Check: any;
      try {
        // eslint-disable-next-line global-require,import/no-dynamic-require
        Check = require(`${pluginChecksDir}/${this.checkName}`).default;
      } catch (err) {
        // eslint-disable-next-line global-require,import/no-dynamic-require
        Check = require(`${checksDir}/${this.checkName}`).default;
      }
      this._check = new Check({}, this.path, ...this.args);
    }
    return this._check;
  }

  public toJSON() {
    return {
      id: this.id,
      checkName: this.checkName,
      checkType: this.checkType,
      path: this.path,
      args: this.args,
    };
  }

  public static create(check: BaseCheck, pluginId: string) {
    const id = generateId(check);
    const { type: checkType, path, args } = check;
    return new this(id, check.constructor.name, checkType, path, args, pluginId);
  }

  public static load(probeObj: any, pluginId: string) {
    const { id, checkName, checkType, path, args } = probeObj;
    return new this(id, checkName, checkType, path, args, pluginId);
  }
}

// HELPERS //////

function generateId(check: BaseCheck) {
  counterByPrefix[check.prefix] = counterByPrefix[check.prefix] || COUNTER_START;
  counterByPrefix[check.prefix] += 1;
  return `${check.prefix}-${convertToAlpha(counterByPrefix[check.prefix])}`.toLowerCase();
}

function convertToAlpha(num) {
  let t;
  let s = '';
  while (num > 0) {
    t = (num - 1) % 26;
    s = String.fromCharCode(65 + t) + s;
    num = ((num - t) / 26) | 0;
  }
  if (!s) {
    throw new Error(`Integer could not be converted: ${num}`);
  }
  return s;
}
