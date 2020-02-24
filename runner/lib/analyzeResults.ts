import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import IDetectionResult from './IDetectionResult';
import * as path from 'path';
import { inspect } from 'util';

const scraperDir = path.resolve(__dirname, '../../scrapers');

export default async function analyzeResults() {
  const scrapers: IScraperResults = {};

  const testsPerCategory: { [category: string]: number } = {};
  for (const scraper of readdirSync(scraperDir)) {
    if (
      scraper === '.DS_Store' ||
      scraper === 'lib' ||
      !statSync(scraperDir + '/' + scraper).isDirectory()
    )
      continue;
    const scraperResults = (scrapers[scraper.replace('.json', '')] = {
      passed: 0,
      omitted: 0,
      tests: 0,
      categories: {},
    });
    if (!existsSync(`${scraperDir}/${scraper}/results`)) continue;

    for (const categoryDir of readdirSync(`${scraperDir}/${scraper}/results`)) {
      if (categoryDir === '.DS_Store') continue;
      const resultFiles = readdirSync(`${scraperDir}/${scraper}/results/${categoryDir}`);

      const records: IDetectionResult[] = [];
      const categories = new Set<string>();
      for (const categoryResults of resultFiles.map(
        result =>
          JSON.parse(
            readFileSync(`${scraperDir}/${scraper}/results/${categoryDir}/${result}`, 'utf8'),
          ) as IDetectionResult[],
      )) {
        records.push(...categoryResults);
        for (const record of categoryResults) {
          categories.add(record.category);
        }
      }

      for (const category of categories) {
        if (!testsPerCategory[category]) testsPerCategory[category] = 0;

        const resultsByBrowser: IResultsByGrouping = {};
        const testsRun = new Set<string>();
        const categoryRecords = records.filter(x => {
          if (x.category !== category) return false;
          // NOTE: only take one run per browser grouping - need this for normalization (below) to make any sense
          if (testsRun.has(x.directive.browserGrouping + x.category + x.name + x.expected))
            return false;
          testsRun.add(x.directive.browserGrouping + x.category + x.name + x.expected);
          return true;
        });

        if (categoryRecords.length > testsPerCategory[category]) {
          testsPerCategory[category] = categoryRecords.length;
        }
        for (const record of categoryRecords) {
          const key = record.directive.browserGrouping;
          if (!resultsByBrowser[key]) {
            resultsByBrowser[key] = {
              passed: 0,
              tests: 0,
              omitted: 0,
              failures: [],
              omissions: [],
            };
          }
          const browserResults = resultsByBrowser[key];

          browserResults.tests += 1;
          if (record.success) {
            browserResults.passed += 1;
          } else if (record.omitted) {
            const omission = record.name ?? 'Entire Test';
            browserResults.omitted += 1;
            if (!browserResults.omissions.includes(omission))
              browserResults.omissions.push(omission);
            browserResults.omissions.sort();
          } else if (!browserResults.failures.includes(record.name)) {
            browserResults.failures.push(record.name);
            browserResults.failures.sort();
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
          resultsByBrowser,
        };
      }
    }
  }

  // NOTE: normalize results - some scrapers don't trigger the full suite, so we need to set to same number of tests
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
        const breakdowns = Object.values(categoryResults.resultsByBrowser).length;
        const breakdownAddon = Math.floor(missedTests / breakdowns);

        for (const breakdown of Object.values(categoryResults.resultsByBrowser)) {
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

interface IResultsByGrouping {
  [grouping: string]: IResult & {
    failures: string[];
    omissions: string[];
    resultsByBrowser?: IResultsByGrouping;
  };
}

interface IScraperResults {
  [scraper: string]: IResult & {
    categories: IResultsByGrouping;
  };
}

interface IResult {
  passed: number;
  tests: number;
  omitted: number;
}
