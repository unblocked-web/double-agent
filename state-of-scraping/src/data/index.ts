import scrapersJson from '@/data/scrapers.json';
import categoriesJson from '@/data/categories.json';
import IScraperTestResult from '@double-agent/runner/interfaces/IScraperTestResult';

const scrapers = (scrapersJson as unknown) as { [scraper: string]: IScraperTestResult };

const categories = (categoriesJson as unknown) as {
  [category: string]: { layer: string; module: string; implemented: boolean };
};

export { scrapers, categories };
