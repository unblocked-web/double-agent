import getAllDetectors from '@double-agent/runner/lib/getAllDetectors';
import * as fs from 'fs';
import mergeScraperResults from '../lib/mergeScraperResults';
import browserWeightedBotScore from '../lib/browserWeightedBotScore';

const outputFile = __dirname + '/../output/scraper-detection-results.md';

export default async function buildScraperDetectionResults() {
  const allDetectors = getAllDetectors(false, false);
  const categories: string[] = [];
  for (const detector of allDetectors) {
    categories.push(...detector.checkCategories);
  }
  const results = await mergeScraperResults(false);

  const entries = Object.values(results)
    .map(scraper => {
      const intoliScore = browserWeightedBotScore(scraper, categories, 'intoli', true, 10);
      const topScore = browserWeightedBotScore(scraper, categories, 'statcounter', true, 10);

      return {
        intoli: intoliScore.botScore,
        topScore: topScore.botScore,
        title: scraper.title,
      };
    })
    .sort((a, b) => {
      return b.intoli - a.intoli;
    });

  let md = `[]() | Generator | Top Browsers
--- | :---: | :---:`;
  for (const scraper of entries) {
    md += `\n${scraper.title} | ${scraper.intoli} | ${scraper.topScore}`;
  }

  fs.writeFileSync(outputFile, md);
}
