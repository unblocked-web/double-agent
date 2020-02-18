import { existsSync, readdirSync, readFileSync } from 'fs';
import IDetectionResult from './IDetectionResult';
import * as path from 'path';
import { inspect } from 'util';

const scraperDir = path.resolve(__dirname, '../../scrapers');

export default function analyzeResults() {
  const scrapers: IScraperResults = {};

  const testsPerCategory: { [category: string]: number } = {};
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
        if (!testsPerCategory[category]) testsPerCategory[category] = 0;

        const resultsBreakdown: IResultsByCategory = {};
        const categoryRecords = records.filter(x => x.category === category);
        if (categoryRecords.length > testsPerCategory[category]) {
          testsPerCategory[category] = categoryRecords.length;
        }
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
            const omission = record.name ?? 'Entire Test';
            resultsBreakdown[key].omitted += 1;
            if (!resultsBreakdown[key].omissions.includes(omission))
              resultsBreakdown[key].omissions.push(omission);
            resultsBreakdown[key].omissions.sort();
          } else if (!resultsBreakdown[key].failures.includes(record.name)) {
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
  // normalize results - some scrapers don't trigger the full suite, so we need to set to same number of tests
  const allTests = Object.values(testsPerCategory).reduce((a, b) => a + b, 0);
  for (const [, overallResults] of Object.entries(scrapers)) {
    if (overallResults.tests < allTests) {
      const testsToAdd = allTests - overallResults.tests;
      overallResults.tests += testsToAdd;
      overallResults.omitted += testsToAdd;
    }
    for (const [category, categoryResults] of Object.entries(overallResults.categories))
      if (categoryResults.tests !== testsPerCategory[category]) {
        const missedTests = testsPerCategory[category] - categoryResults.tests;
        categoryResults.tests += missedTests;
        categoryResults.omitted += missedTests;
        const breakdowns = Object.values(categoryResults.resultsBreakdown).length;
        const breakdownAddon = Math.floor(missedTests / breakdowns);

        for (const breakdown of Object.values(categoryResults.resultsBreakdown)) {
          breakdown.tests += breakdownAddon;
          breakdown.omitted += breakdownAddon;
        }
      }
  }

  const finalStats: {
    [scraper: string]: {
      [category: string]: {
        passedPct: number;
        notCalled: number;
        inconsistencies: number;
      };
      overall: { passedPct: number; notCalled: number; inconsistencies: number };
    };
  } = {};
  for (const [key, entry] of Object.entries(scrapers)) {
    finalStats[key] = {
      overall: {
        passedPct: Number(((entry.passed / entry.tests) * 100).toFixed(1)),
        notCalled: entry.omitted,
        inconsistencies: entry.tests - entry.passed - entry.omitted,
      },
    };
    for (const [category, metrics] of Object.entries(entry.categories)) {
      finalStats[key][category] = {
        passedPct: Number(((metrics.passed / metrics.tests) * 100).toFixed(1)),
        notCalled: metrics.omitted,
        inconsistencies: metrics.tests - metrics.passed - metrics.omitted,
      };
    }
  }

  console.log(inspect(scrapers, false, null, true));
  console.log(inspect(finalStats, false, null, true));
  return {
    scrapers,
    finalStats,
  };
}

interface IResultsByCategory {
  [category: string]: IResult & {
    failures: string[];
    omissions: string[];
    resultsBreakdown?: IResultsByCategory;
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
