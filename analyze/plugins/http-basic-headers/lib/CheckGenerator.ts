import IHttpBasicHeadersProfile from '@double-agent/collect-http-basic-headers/interfaces/IProfile';
import DefaultValueCheck from './checks/DefaultValueCheck';
import StringCaseCheck from './checks/StringCaseCheck';
import ArrayOrderIndexCheck from './checks/ArrayOrderIndexCheck';
import { extractOfficialHeaderKeys, isOfficialDefaultValueKey, isOfficialHeader } from './Utils';

export default class CheckGenerator {
  public readonly checks = [];

  private readonly profile: IHttpBasicHeadersProfile;
  private readonly userAgentId: string;

  constructor(profile: IHttpBasicHeadersProfile) {
    this.profile = profile;
    this.userAgentId = profile.userAgentId;
    this.addHeaderCaseChecks();
    this.addHeaderOrderChecks();
    this.addDefaultValueChecks();
  }

  private addDefaultValueChecks() {
    const { userAgentId } = this;
    const defaultValuesMap: {
      [protocol: string]: {
        [httpMethod: string]: { [key: string]: Set<string> };
      };
    } = {};

    // // ToDo: Preflight cannot check value, only case
    // if (resource === ResourceType.Preflight) {
    //   checkHeaderCaseOnly = true;
    // }

    for (const page of this.profile.data) {
      const { protocol, method: httpMethod } = page;
      if (protocol === 'http2') continue; // ToDo: add support for http2

      defaultValuesMap[protocol] = defaultValuesMap[protocol] || {};
      defaultValuesMap[protocol][httpMethod] = defaultValuesMap[protocol][httpMethod] || {};
      for (const [key, value] of page.rawHeaders) {
        if (!isOfficialDefaultValueKey(key)) continue;
        const lowerKey = key.toLowerCase();
        defaultValuesMap[protocol][httpMethod][lowerKey] =
          defaultValuesMap[protocol][httpMethod][lowerKey] || new Set();
        defaultValuesMap[protocol][httpMethod][lowerKey].add(value);
      }
    }

    for (const protocol of Object.keys(defaultValuesMap)) {
      if (protocol === 'http2') continue; // ToDo: add support for http2
      for (const [httpMethod, valuesByKey] of Object.entries(defaultValuesMap[protocol])) {
        for (const [key, values] of Object.entries(valuesByKey)) {
          const meta = { path: key, protocol, httpMethod };
          const check = new DefaultValueCheck({ userAgentId }, meta, Array.from(values));
          this.checks.push(check);
        }
      }
    }
  }

  private addHeaderCaseChecks() {
    const { userAgentId } = this;

    for (const page of this.profile.data) {
      const { protocol, method: httpMethod } = page;
      if (protocol === 'http2') continue; // ToDo: add support for http2

      for (const [key] of page.rawHeaders) {
        if (!isOfficialHeader(key)) continue;
        const meta = { path: key.toLowerCase(), protocol, httpMethod };
        const check = new StringCaseCheck({ userAgentId }, meta, key);
        this.checks.push(check);
      }
    }
  }

  private addHeaderOrderChecks() {
    const { userAgentId } = this;
    const headerKeysMap: { [protocol: string]: { [httpMethod: string]: string[][] } } = {};

    for (const page of this.profile.data) {
      const { protocol, method: httpMethod } = page;
      if (protocol === 'http2') continue; // ToDo: add support for http2

      headerKeysMap[protocol] = headerKeysMap[protocol] || {};
      headerKeysMap[protocol][httpMethod] = headerKeysMap[protocol][httpMethod] || [];
      const keys = extractOfficialHeaderKeys(page.rawHeaders).map(x => x.toLowerCase());
      if (!keys.length) continue;
      headerKeysMap[protocol][httpMethod].push(keys);
    }

    for (const protocol of Object.keys(headerKeysMap)) {
      if (protocol === 'http2') continue; // ToDo: add support for http2

      for (const [httpMethod, headerKeys] of Object.entries(headerKeysMap[protocol])) {
        const orderIndexMap = extractOrderIndexMapFromArrays(headerKeys);
        for (const key of Object.keys(orderIndexMap)) {
          const path = `headers.${key}`;
          const orderIndex = orderIndexMap[key];
          const meta = { path, protocol, httpMethod };
          const check = new ArrayOrderIndexCheck({ userAgentId }, meta, orderIndex);
          this.checks.push(check);
        }
      }
    }
  }
}

function extractOrderIndexMapFromArrays(arrays: string[][]) {
  const tmpIndex: { [key: string]: { prev: Set<string>; next: Set<string> } } = {};
  const finalIndex: { [key: string]: [string[], string[]] } = {};

  for (const array of arrays) {
    array.forEach((key, i) => {
      tmpIndex[key] = tmpIndex[key] || { prev: new Set(), next: new Set() };
      array.slice(0, i).forEach(prev => tmpIndex[key].prev.add(prev));
      array.slice(i + 1).forEach(next => tmpIndex[key].next.add(next));
      finalIndex[key] = finalIndex[key] || [[], []];
      finalIndex[key][0] = Array.from(tmpIndex[key].prev);
      finalIndex[key][1] = Array.from(tmpIndex[key].next);
    });
  }

  return finalIndex;
}
