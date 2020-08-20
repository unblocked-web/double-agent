import IHttpBasicHeadersProfile from '@double-agent/collect-http-basic-headers/interfaces/IProfile';
import DefaultValueCheck from './checks/DefaultValueCheck';
import StringCaseCheck from './checks/StringCaseCheck';
import ArrayOrderIndexCheck from './checks/ArrayOrderIndexCheck';
import { extractOfficialHeaderKeys, isOfficialDefaultValueKey, isOfficialHeader } from './Utils';

export default class CheckGenerator {
  public readonly checks = [];

  private readonly profile: IHttpBasicHeadersProfile;
  private readonly useragentId: string;

  constructor(profile: IHttpBasicHeadersProfile) {
    this.profile = profile;
    this.useragentId = profile.useragentId;
    this.addHeaderCaseChecks();
    this.addHeaderOrderChecks();
    this.addDefaultValueChecks();
  }

  private addDefaultValueChecks() {
    const { useragentId } = this;
    const defaultValuesMap: { [httpMethod: string]: { [key: string]: Set<string> } } = {};

    // // ToDo: Preflight cannot check value, only case
    // if (resource === ResourceType.Preflight) {
    //   checkHeaderCaseOnly = true;
    // }

    for (const page of this.profile.data) {
      const httpMethod = page.method;
      defaultValuesMap[httpMethod] = defaultValuesMap[httpMethod] || {};
      for (const [key, value] of page.rawHeaders) {
        if (!isOfficialDefaultValueKey(key)) continue;
        const lkey = key.toLowerCase();
        defaultValuesMap[httpMethod][lkey] = defaultValuesMap[httpMethod][lkey] || new Set();
        defaultValuesMap[httpMethod][lkey].add(value);
      }
    }

    for (const [httpMethod, valuesByKey] of Object.entries(defaultValuesMap)) {
      for (const [key, values] of Object.entries(valuesByKey)) {
        const check = new DefaultValueCheck({ useragentId, httpMethod }, key, Array.from(values));
        this.checks.push(check);
      }
    }
  }

  private addHeaderCaseChecks() {
    const { useragentId } = this;

    for (const page of this.profile.data) {
      const httpMethod = page.method;
      for (const [key] of page.rawHeaders) {
        if (!isOfficialHeader(key)) continue;
        const check = new StringCaseCheck({ useragentId, httpMethod }, key.toLowerCase(), key);
        this.checks.push(check);
      }
    }
  }

  private addHeaderOrderChecks() {
    const { useragentId } = this;
    const allHeaderKeys: string[][] = [];

    for (const page of this.profile.data) {
      const headerKeys = extractOfficialHeaderKeys(page.rawHeaders).map(x => x.toLowerCase());
      if (!headerKeys.length) continue;
      allHeaderKeys.push(headerKeys);
    }
    const orderIndexMap = extractOrderIndexMapFromArrays(allHeaderKeys);
    for (const key of Object.keys(orderIndexMap)) {
      const path = `headers.${key}`;
      const orderIndex = orderIndexMap[key];
      const check = new ArrayOrderIndexCheck({ useragentId }, path, orderIndex);
      this.checks.push(check);
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
