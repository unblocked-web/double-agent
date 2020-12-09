import BaseCheck from '@double-agent/analyze/lib/checks/BaseCheck';
import NumberCheck from '@double-agent/analyze/lib/checks/NumberCheck';
import StringCheck from '@double-agent/analyze/lib/checks/StringCheck';
import BooleanCheck from '@double-agent/analyze/lib/checks/BooleanCheck';
import DecimalLengthCheck from '@double-agent/analyze/lib/checks/DecimalLengthCheck';
import NumberLengthCheck from '@double-agent/analyze/lib/checks/NumberLengthCheck';
import IBaseProfile from '@double-agent/collect/interfaces/IBaseProfile';
import extractDomEndpoints, { IEndpoint } from './extractDomEndpoints';
import EndpointType, { IEndpointType } from '../interfaces/EndpointType';
import KeyOrderCheck from './checks/KeyOrderCheck';
import FlagsCheck from './checks/FlagsCheck';
import PrototypeCheck from './checks/PrototypeCheck';
import FunctionCheck from './checks/FunctionCheck';
import TypeCheck from './checks/TypeCheck';
import StacktraceCheck from './checks/StacktraceCheck';
import GetterCheck from './checks/GetterCheck';
import SetterCheck from './checks/SetterCheck';
import RefCheck from './checks/RefCheck';
import ClassCheck from './checks/ClassCheck';
import ArrayCheck from './checks/ArrayCheck';
import SymbolCheck from './checks/SymbolCheck';
import WebdriverCheck from './checks/WebdriverCheck';

export default class CheckGenerator {
  public checks: BaseCheck[] = [];

  private readonly endpointsByPath: { [path: string]: IEndpoint } = {};
  private readonly userAgentId: string;

  constructor(profile: IBaseProfile<any>) {
    const httpDom = profile.data.https;
    this.userAgentId = profile.userAgentId;
    this.endpointsByPath = extractDomEndpoints(httpDom);
    for (const { path, object } of Object.values(this.endpointsByPath)) {
      this.addKeyOrderChecks(path, object);
      this.addFlagChecks(path, object);
      this.addPrototypeChecks(path, object);
      this.addNumberChecks(path, object);
      this.addFunctionChecks(path, object);
      this.addStringChecks(path, object);
      this.addGetterChecks(path, object);
      this.addSetterChecks(path, object);
      this.addRefChecks(path, object);
      this.addClassChecks(path, object);
      this.addBooleanChecks(path, object);
      this.addArrayChecks(path, object);
      this.addSymbolChecks(path, object);
      this.addTypeChecks(path, object);
      this.addWebdriverChecks(path);
    }
  }

  private addKeyOrderChecks(path: string, object) {
    if (isWebdriverPath(path)) return;
    if (
      !['object', 'prototype', 'function', 'class', 'constructor', 'array'].includes(object._$type)
    )
      return;
    if (!object._$keyOrder?.length) return;

    const { userAgentId } = this;
    const keys = removeWebdriverKeys(path, object._$keyOrder);
    this.add(new KeyOrderCheck({ userAgentId }, path, keys));
  }

  private addFlagChecks(path: string, object) {
    if (isWebdriverPath(path)) return;

    const { userAgentId } = this;

    if (object._$flags) {
      this.add(new FlagsCheck({userAgentId}, path, object._$flags.split('')));
    }

    if (object._$functionMethods) {
      for (const name of Object.keys(object._$functionMethods)) {
        const methodPath = `${path}.${name}`;
        const methodObj = object._$functionMethods[name];
        this.add(new FlagsCheck({ userAgentId }, methodPath, methodObj._$flags.split('')));
      }
    }
  }

  private addPrototypeChecks(path: string, object) {
    if (isWebdriverPath(path)) return;
    if (!['prototype', 'object', 'constructor', 'array'].includes(object._$type)) return;

    const { userAgentId } = this;
    this.add(new PrototypeCheck({ userAgentId }, path, object._$protos));
  }

  private addNumberChecks(path: string, object): IChecks {
    if (isWebdriverPath(path)) return;
    if (object._$type !== EndpointType.number) return;

    const { userAgentId } = this;
    if (ignoreNumberValuePaths.some(x => x.test(path))) {
      this.add(new TypeCheck({ userAgentId }, path, EndpointType.number));
    } else if (object._$value === null || object._$value === undefined) {
      this.add(new NumberCheck({ userAgentId }, path, object._$value));
    } else if (String(object._$value).includes('.')) {
      const decimalStr = String(object._$value).split('.')[1];
      this.add(new DecimalLengthCheck({ userAgentId }, path, decimalStr.length));
    } else {
      this.add(new NumberLengthCheck({ userAgentId }, path, String(object._$value).length));
    }
  }

  private addFunctionChecks(path: string, object) {
    if (isWebdriverPath(path)) return;
    if (!object._$function) return;
    if (!['function', 'class', 'prototype'].includes(object._$type)) {
      throw new Error(`Unknown function type: ${object._$type}`);
    }

    const { userAgentId } = this;
    const codeString = object._$function;
    const invocation = extractInvocation(path, object);
    const methods = {};
    if (object._$functionMethods) {
      for (const name of Object.keys(object._$functionMethods)) {
        methods[name] = object._$functionMethods[name]._$value;
      }
    }

    const functionCheck = new FunctionCheck({ userAgentId }, path, codeString, methods, invocation);
    this.add(functionCheck);
  }

  private addStringChecks(path: string, object): IChecks {
    if (isWebdriverPath(path)) return;
    if (object._$type !== EndpointType.string) return;

    const { userAgentId } = this;
    if (ignoreStringValuePaths.some(x => x.test(path))) {
      this.add(new TypeCheck({ userAgentId }, path, EndpointType.string));
    } else if (path.endsWith('.stack')) {
      // is stack trace
      this.add(new StacktraceCheck({ userAgentId }, path, object._$value));
    } else {
      this.add(new StringCheck({ userAgentId }, path, object._$value));
    }
  }

  private addGetterChecks(path: string, object) {
    if (isWebdriverPath(path)) return;
    if (!object._$get) return;

    const { userAgentId } = this;
    this.add(new GetterCheck({ userAgentId }, path, { codeString: object._$get }));
    this.add(
      new GetterCheck({ userAgentId }, path, { codeStringToString: object._$getToStringToString }),
    );

    if (object._$accessException) {
      this.add(
        new GetterCheck({ userAgentId }, path, { accessException: object._$accessException }),
      );
    }
  }

  private addSetterChecks(path: string, object) {
    if (isWebdriverPath(path)) return;
    if (!object._$set) return;

    const { userAgentId } = this;
    this.add(new SetterCheck({ userAgentId }, path, { codeString: object._$set }));
    this.add(
      new SetterCheck({ userAgentId }, path, { codeStringToString: object._$setToStringToString }),
    );
  }

  private addRefChecks(path: string, object) {
    if (isWebdriverPath(path)) return;
    if (object._$type !== EndpointType.ref) return;

    const { userAgentId } = this;
    this.add(new RefCheck({ userAgentId }, path, object._$ref));
  }

  private addClassChecks(path: string, object) {
    if (isWebdriverPath(path)) return;
    if (object._$type !== EndpointType.class) return;

    const { userAgentId } = this;
    const hasFunction = !!object._$function;
    this.add(new ClassCheck({ userAgentId }, path, { hasFunction }));

    const constructorPath = `${path}.new()`;
    const constructorException = this.endpointsByPath[constructorPath]?.object
      ._$constructorException;
    if (constructorException) {
      this.add(new ClassCheck({ userAgentId }, path, { constructorException }));
    }
  }

  private addBooleanChecks(path: string, object) {
    if (isWebdriverPath(path)) return;
    if (object._$type !== EndpointType.boolean) return;

    const { userAgentId } = this;
    if (ignoreBooleanValuePaths.some(x => x.test(path))) {
      this.add(new TypeCheck({ userAgentId }, path, EndpointType.boolean));
    } else {
      this.add(new BooleanCheck({ userAgentId }, path, object._$value));
    }
  }

  private addArrayChecks(path: string, object) {
    if (isWebdriverPath(path)) return;
    if (object._$type !== EndpointType.array) return;

    const { userAgentId } = this;
    const hasLengthProperty = !!object._$keyOrder?.includes('length');
    this.add(new ArrayCheck({ userAgentId }, path, hasLengthProperty));
  }

  private addSymbolChecks(path: string, object) {
    if (isWebdriverPath(path)) return;
    if (object._$type !== EndpointType.symbol) return;

    const { userAgentId } = this;
    this.add(new SymbolCheck({ userAgentId }, path, object._$value));
  }

  private addTypeChecks(path: string, object) {
    if (isWebdriverPath(path)) return;
    if (!['object', 'constructor', 'dom'].includes(object._$type)) return;

    const { userAgentId } = this;
    this.add(new TypeCheck({ userAgentId }, path, object._$type));
  }

  private addWebdriverChecks(path: string) {
    if (!isWebdriverPath(path)) return;

    const { userAgentId } = this;
    this.add(new WebdriverCheck({ userAgentId }, path));
  }

  private add(check: BaseCheck) {
    this.checks.push(check);
  }
}

/////// ////////////////////////////////////////////////////////////////

function extractInvocation(path: string, object: any) {
  if (ignoreFunctionInvocationPaths.some(x => x.test(path))) {
    return null;
  }
  if (object._$invocation === undefined) {
    return null;
  }
  return object._$invocation;
}

function isWebdriverPath(path: string) {
  return (
    webdriverPaths.has(path) ||
    path.startsWith('window.document.$cdc_') ||
    path.startsWith('window.cdc_adoQpoasnfa76pfcZLmcfl_') ||
    path.includes('.getDestinationInsertionPoints')
  );
}

function removeWebdriverKeys(path: string, keys: string[]) {
  const cleanedKeys: string[] = [];

  for (const key of keys) {
    const keyPath = `${path}.${key}`;
    if (!isWebdriverPath(keyPath)) {
      cleanedKeys.push(key);
    }
  }

  return cleanedKeys;
}

const webdriverPaths = new Set([
  'window.navigator.webdriver',
  'window.Navigator.prototype.webdriver',
  'window.Element.prototype.createShadowRoot',
  'window.Document.prototype.registerElement',
  'detached.clearStale',
  'detached.isNodeReachable_',
]);

const ignoreNumberValuePaths = [
  new RegExp('width', 'i'),
  new RegExp('height', 'i'),
  new RegExp('top', 'i'),
  new RegExp('left', 'i'),
  new RegExp('scroll', 'i'),
  new RegExp('memory.usedJSHeapSize'),
  new RegExp('performance.timing.secureConnectionStart'), // this value can be 0 if no secure connection is made, which is somewhat load/timing dependent
  new RegExp('screen[XY]'),
  new RegExp('pageT'),
  new RegExp('window.chrome.loadTimes.new\\(\\).+'),
  new RegExp('AudioContext.new.+.baseLatency'),
  new RegExp('navigator.connection.*'),
  new RegExp(/AudioContext.+currentTime/), // can be 0 if stop gets triggered by dom perusal
  new RegExp('window.performance.timeOrigin'),
  new RegExp('window.navigator.hardwareConcurrency'), // ToDo: Add once we have better grasp of device ranges
];

const ignoreFunctionInvocationPaths = [
  new RegExp('window.Math.random'),
  new RegExp('window.Date.now'),
  new RegExp('window.BarcodeDetector.getSupportedFormats'), // ToDo: Add once we solve why BrowserStack is returning empty arrays on some OSes
];

const ignoreStringValuePaths = [
  new RegExp('uri', 'i'),
  new RegExp('url', 'i'),
  new RegExp('href', 'i'),
  new RegExp('location', 'i'),
  new RegExp('location.port', 'i'),
  new RegExp('domain', 'i'),
  new RegExp('referrer', 'i'),
  new RegExp('navigator.appVersion'),
  new RegExp('navigator.userAgent'),
  new RegExp('id'),
  new RegExp('window.chrome.loadTimes.new\\(\\).+'),
  new RegExp(/AudioContext.*state/),
  new RegExp('Document.new.+lastModified'),
];

const ignoreBooleanValuePaths = [
  new RegExp('window.navigator.userActivation.+'), // indicates user has done some activity
  new RegExp('loadTimes.+wasNpnNegotiated'), // depends on user connection
  new RegExp('window.find'), // this seems to be returning true on webdriver, but not in a real browser
  new RegExp('window.chrome.loadTimes.new\\(\\).+'),
];

// types /////////////////////////////////////////////////////////////////////////////////////

interface ICheck {
  path: string;
  type: IEndpointType;
  value?: any;

  // numbers
  length?: number;
  decimalLength?: number;

  // functions
  methods?: any;
  invocation?: string;
  errorClass?: string;

  // class
  isFunction?: boolean;

  // getters, setters, and functions
  codeString?: string;
  codeStringToString?: string;

  // getters
  accessException?: string;

  // class constructor
  constructorException?: string;

  // ref
  ref?: string;

  // arrays
  hasLength?: boolean;

  // flags
  isFrozen?: boolean;
  isSealed?: boolean;
}

type IChecks = ICheck[];
