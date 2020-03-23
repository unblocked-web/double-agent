import scrapersJson from '@/data/scrapers.json';
import categoriesJson from '@/data/categories.json';
import IUserBucketAverages from '@double-agent/runner/interfaces/IUserBucketAverages';
import IBrowserFindings, { IBrowserPercents } from '@double-agent/runner/interfaces/IBrowserFindings';

const scrapers = (scrapersJson as unknown) as {
  [scraper: string]: {
    title: string;
    description: string;
    browserFindings: IBrowserFindings;
    intoliBrowsers: IBrowserPercents[];
    topBrowsers: IBrowserPercents[];
    buckets: IUserBucketAverages;
  };
};

const categories = (categoriesJson as unknown) as {
  [category: string]: { layer: string; module: string; implemented: boolean };
};

export { scrapers, categories };
