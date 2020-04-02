import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import * as path from 'path';
import { inspect } from 'util';
import { IBrowserPercents } from '../interfaces/IBrowserFindings';
import IUserBucketAverages from '../interfaces/IUserBucketAverages';
import IScraperTestResult from '../interfaces/IScraperTestResult';

const scraperDir = path.resolve(__dirname, '../../scrapers');

export default async function mergeScraperResults(print = true) {
  const scrapers: { [scraper: string]: IScraperTestResult } = {};

  const baseEntry = getJson<{ [scraper: string]: { title: string; description: string } }>(
    `${scraperDir}/scrapers.json`,
  );
  for (const scraper of readdirSync(scraperDir)) {
    if (
      scraper === '.DS_Store' ||
      scraper === 'lib' ||
      !statSync(scraperDir + '/' + scraper).isDirectory()
    )
      continue;
    if (!existsSync(`${scraperDir}/${scraper}/browser-flags`)) continue;

    const botStats = getJson<{
      intoliBrowsers: IBrowserPercents[];
      topBrowsers: IBrowserPercents[];
    }>(`${scraperDir}/${scraper}/botStats.json`);

    const bucketStats = getJson<IUserBucketAverages>(`${scraperDir}/${scraper}/bucketStats.json`);

    const scraperResults = (scrapers[scraper.replace('.json', '')] = {
      scraper,
      ...baseEntry[scraper],
      browserFindings: {},
      buckets: bucketStats,
      intoliBrowsers: botStats.intoliBrowsers,
      topBrowsers: botStats.topBrowsers,
    } as IScraperTestResult);

    for (const browser of readdirSync(`${scraperDir}/${scraper}/browser-flags`)) {
      if (browser === '.DS_Store' || !browser.endsWith('.json')) continue;
      const browserKey = browser.replace('.json', '');
      scraperResults.browserFindings[browserKey] = getJson(
        `${scraperDir}/${scraper}/browser-flags/${browser}`,
      );
    }
  }

  if (print) console.log('Scrapers', inspect(scrapers, false, null, true));
  return scrapers;
}

function getJson<T>(filepath: string) {
  return JSON.parse(readFileSync(filepath, 'utf8')) as T;
}