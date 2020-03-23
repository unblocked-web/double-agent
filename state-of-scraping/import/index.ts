import { existsSync, promises as fs } from 'fs';
import getAllDetectors, { stackOrder } from '@double-agent/runner/lib/getAllDetectors';

(async () => {
  await updateCategories();
  const scraperDir = `${__dirname}/../../scrapers`;
  const scraperDescriptions = JSON.parse(await fs.readFile(`${scraperDir}/scrapers.json`, 'utf8'));
  const scrapers: any = {};
  for (const scraper of Object.keys(scraperDescriptions)) {
    if (!existsSync(`${scraperDir}/${scraper}/botStats.json`)) {
      continue;
    }
    const botStats = JSON.parse(
      await fs.readFile(`${scraperDir}/${scraper}/botStats.json`, 'utf8'),
    );
    const buckets = JSON.parse(
      await fs.readFile(`${scraperDir}/${scraper}/bucketStats.json`, 'utf8'),
    );

    scrapers[scraper] = {
      ...scraperDescriptions[scraper],
      ...botStats,
      buckets,
    };
  }
  await fs.writeFile(`${__dirname}/../src/data/scrapers.json`, JSON.stringify(scrapers, null, 2));
})();

async function updateCategories() {
  const categorySources: ICategorySources = {};

  const detectors = await getAllDetectors(false, false);

  detectors.sort((a, b) => {
    const stackDiff = stackOrder.indexOf(a.layer) - stackOrder.indexOf(b.layer);
    if (stackDiff !== 0) return stackDiff;

    const layerCompare = a.layer.localeCompare(b.layer);
    if (layerCompare !== 0) return layerCompare;

    if (a.plugin && !b.plugin) return -1;
    else if (b.plugin && !a.plugin) return 1;
  });

  for (const detector of detectors) {
    for (const category of detector.checkCategories) {
      categorySources[category] = {
        layer: detector.layer,
        module: detector.dir.split('/').pop(),
        implemented: !!detector.plugin,
      };
    }
  }
  await fs.writeFile(
    `${__dirname}/../src/data/categories.json`,
    JSON.stringify(categorySources, null, 2),
  );
}
interface ICategorySources {
  [category: string]: {
    layer: string;
    module: string;
    implemented: boolean;
  };
}
