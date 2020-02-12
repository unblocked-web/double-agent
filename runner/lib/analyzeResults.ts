import { existsSync, readdirSync, readFileSync } from 'fs';
import IDetectionResult from './IDetectionResult';
import * as path from 'path';
import { inspect } from 'util';

const scraperDir = path.resolve(__dirname, '../../scrapers');

export default function analyzeResults() {
  const scrapers = {};
  for (const scraper of readdirSync(scraperDir)) {
    const scraperResults = (scrapers[scraper.replace('.json', '')] = {
      passed: 0,
      omitted: 0,
      tests: 0,
      suites: {},
    });
    if (!existsSync(`${scraperDir}/${scraper}/results`)) continue;

    for (const result of readdirSync(`${scraperDir}/${scraper}/results`)) {
      if (!result.endsWith('.json')) continue;
      const records = JSON.parse(
        readFileSync(`${scraperDir}/${scraper}/results/${result}`, 'utf8'),
      ) as IDetectionResult[];
      const resultsBreakdown: IResultsByCategory = {};

      const isOsTest =
        records
          .filter(x => x.directive.browser)
          .reduce((tot, entry) => {
            tot.add(
              [entry.directive.browser, entry.directive.browserMajorVersion]
                .filter(Boolean)
                .join(' '),
            );
            return tot;
          }, new Set<string>()).size === 1;

      for (const record of records) {
        const key = isOsTest
          ? record.directive.os
          : record.directive.browser + ' ' + record.directive.browserMajorVersion;
        if (!resultsBreakdown[key])
          resultsBreakdown[key] = { passed: 0, tests: 0, omitted: 0, failures: [] };
        resultsBreakdown[key].tests += 1;
        if (record.success) resultsBreakdown[key].passed += 1;
        else if (record.omitted) resultsBreakdown[key].omitted += 1;
        else if (!resultsBreakdown[key].failures.includes(record.name)) {
          resultsBreakdown[key].failures.push(record.name);
        }
      }

      const passed = records.filter(x => x.success).length;
      scraperResults.passed += passed;
      scraperResults.omitted += records.filter(x => x.omitted === true).length;
      scraperResults.tests += records.length;
      scraperResults.suites[result.replace('.json', '')] = {
        passed,
        tests: records.length,
        resultsBreakdown,
      };
    }
  }

  for (const [key, entry] of Object.entries(scrapers)) {
  }

  console.log(inspect(scrapers, false, null, true));
}

analyzeResults();

interface IResultsByCategory {
  [browser: string]: {
    passed: number;
    tests: number;
    omitted: number;
    failures: string[];
  };
}
