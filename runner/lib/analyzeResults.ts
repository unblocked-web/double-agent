import { existsSync, readdirSync, readFileSync } from 'fs';
import IDetectionResult from './IDetectionResult';
import * as path from 'path';
import { inspect } from 'util';

const scraperDir = path.resolve(__dirname, '../../scrapers');

export default function analyzeResults() {
  const scrapers: IScraperResults = {};
  for (const scraper of readdirSync(scraperDir)) {
    if (scraper === '.DS_Store') continue;
    const scraperResults = (scrapers[scraper.replace('.json', '')] = {
      passed: 0,
      omitted: 0,
      tests: 0,
      categories: {},
    });
    if (!existsSync(`${scraperDir}/${scraper}/results`)) continue;

    for (const result of readdirSync(`${scraperDir}/${scraper}/results`)) {
      if (!result.endsWith('.json')) continue;
      const records = JSON.parse(
        readFileSync(`${scraperDir}/${scraper}/results/${result}`, 'utf8'),
      ) as IDetectionResult[];

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

      const categories = new Set<string>();
      for (const record of records) {
        categories.add(record.category);
      }
      for (const category of categories) {
        const resultsBreakdown: IResultsByCategory = {};
        const categoryRecords = records.filter(x => x.category === category);
        for (const record of categoryRecords) {
          const key = isOsTest
            ? record.directive.os
            : record.directive.browser + ' ' + record.directive.browserMajorVersion;
          if (!resultsBreakdown[key])
            resultsBreakdown[key] = {
              passed: 0,
              tests: 0,
              omitted: 0,
              failures: [],
              omissions: [],
            };
          resultsBreakdown[key].tests += 1;
          if (record.success) resultsBreakdown[key].passed += 1;
          else if (record.omitted) {
            resultsBreakdown[key].omitted += 1;
            resultsBreakdown[key].omissions.push(record.name);
            resultsBreakdown[key].omissions.sort();
          }
          else if (!resultsBreakdown[key].failures.includes(record.name)) {
            resultsBreakdown[key].failures.push(record.name);
            resultsBreakdown[key].failures.sort();
          }
        }

        const passed = categoryRecords.filter(x => x.success).length;
        scraperResults.passed += passed;
        scraperResults.omitted += categoryRecords.filter(x => x.omitted === true).length;
        scraperResults.tests += categoryRecords.length;
        scraperResults.categories[category] = {
          passed,
          omitted: categoryRecords.filter(x => x.omitted === true).length,
          tests: categoryRecords.length,
          resultsBreakdown,
        };
      }
    }
  }

  const finalStats: {
    [scraper: string]: {
      [category: string]: { passed: number; omitted: number };
      overall: { passed: number; omitted: number };
    };
  } = {};
  for (const [key, entry] of Object.entries(scrapers)) {
    finalStats[key] = {
      overall: {
        passed: Number(((entry.passed / entry.tests) * 100).toFixed(1)),
        omitted: Number(((entry.omitted / entry.tests) * 100).toFixed(1)),
      },
    };
    for (const [category, metrics] of Object.entries(entry.categories)) {
      finalStats[key][category] = {
        passed: Number(((metrics.passed / metrics.tests) * 100).toFixed(1)),
        omitted: Number(((metrics.omitted / metrics.tests) * 100).toFixed(1)),
      };
    }
  }

  console.log(inspect(scrapers, false, null, true));
  console.log(inspect(finalStats, false, null, true));
}

analyzeResults();

interface IResultsByCategory {
  [browser: string]: IResult & {
    failures: string[];
    omissions: string[];
  };
}

interface IScraperResults {
  [scraper: string]: IResult & {
    categories: IResultsByCategory;
  };
}

interface IResult {
  passed: number;
  tests: number;
  omitted: number;
}
