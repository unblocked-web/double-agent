import IBrowserFindings, { IBrowserPercents } from '../interfaces/IBrowserFindings';
import UserBucket from '../interfaces/UserBucket';
import { getActiveBucketChecks } from '@double-agent/visits-over-time/lib/bucketChecks';
import { getVisitLimit } from '@double-agent/visits-over-time/lib/visitLimits';
import IScraperTestResult from '../interfaces/IScraperTestResult';

export default function browserWeightedBotScore(
  scraper: IScraperTestResult,
  activeCategories: string[],
  agentsType: 'intoli' | 'statcounter',
  rotateIP: boolean,
  requestsPerPeriod: number,
) {
  const buckets = scraper.buckets;
  const activeBuckets = Object.entries(buckets)
    .filter(([bucket, entry]) => {
      if (rotateIP && bucket === UserBucket.IpAndPortRange) return false;
      return activeCategories.includes(entry.category);
    })
    .map(([key]) => key);

  const bucketChecks = getActiveBucketChecks(activeBuckets);

  let botMultiplier = 1;
  let botScore = 0;
  const categoryScores: { category: string; botPct: number }[] = [];

  // TODO: convert to average pct instead of max (need percents browsers are picked)
  for (const bucketCheck of bucketChecks) {
    const bucketPcts = bucketCheck.buckets.map(x => buckets[x]?.maxReusePct);
    const bucketability = bucketPcts.reduce((a, b) => (a * 100 * b) / 100, 1);

    const requests = Math.floor((requestsPerPeriod * bucketability) / 100);
    const visitAllowance = getVisitLimit(10, requests);

    botMultiplier = Math.max(visitAllowance.categoryMultiplier, botMultiplier);
    botScore = Math.max(visitAllowance.pctBot, botScore);
    if (visitAllowance.categoryMultiplier > 0) {
      categoryScores.push({
        category: 'Visits - ' + bucketCheck.title,
        botPct: botScore,
      });
    }
  }

  const browsers = agentsType === 'intoli' ? scraper.intoliBrowsers : scraper.topBrowsers;
  for (const category of activeCategories) {
    const weightedAverage = getWeightedAverageForBrowsers(
      scraper.browserFindings,
      category,
      browsers,
      botMultiplier,
    );

    categoryScores.push({
      category,
      botPct: weightedAverage,
    });

    botScore = Math.max(weightedAverage, botScore);
  }
  return {
    botScore,
    categoryScores,
  };
}

function getWeightedAverageForBrowsers(
  findings: IBrowserFindings,
  category: string,
  browsers: IBrowserPercents[],
  botMultiplier: number,
) {
  if (!browsers.length) return 0;
  let avg = 0;
  for (const browser of browsers) {
    const results = findings[browser.browser];
    if (!results[category]) continue;
    const pct = results[category].botPct;
    avg += pct * (browser.percentUsed / 100);
  }
  avg *= botMultiplier;
  if (avg > 100) avg = 100;
  return Math.floor(avg);
}
