import getAllDetectors from '@double-agent/runner/lib/getAllDetectors';
import * as fs from 'fs';
import analyzeResults from '@double-agent/runner/lib/analyzeResults';
import getBrowsersToProfile from '@double-agent/profiler/lib/getBrowsersToProfile';
import IStatcounterBrowser from '@double-agent/profiler/interfaces/IStatcounterBrowser';

import scraperDetails from '../../scrapers/scrapers.json';

const outputFile = __dirname + '/../output/scraper-detection-results.md';

export default async function buildScraperDetectionResults() {
  const allDetectors = getAllDetectors();
  const results = await analyzeResults();

  const scrapers = Object.keys(results.scrapers).sort((a, b) => {
    const failuresA = results.scrapers[a].passed;
    const failuresB = results.scrapers[b].passed;
    return failuresA - failuresB;
  });

  /////////// OVERALL RESULTS TABLE ////////////////////////////////////////////////////////////////
  const browsersToProfile = await getBrowsersToProfile();

  const cols = ['[]()', ...browsersToProfile.browsers.map(decodeBrowserName)];

  let md = `${cols.join(' | ')}
--- | ${browsersToProfile.browsers.map(() => ' :---: ').join('|')}`;
  for (const scraper of scrapers) {
    const scraperResults = results.scrapers[scraper];
    const title = cleanScraperName(scraper);

    let row = `\n[${title}](docs/scraper-detections/${scraper}.md) `;

    for (const browser of browsersToProfile.browsers) {
      const browserKey = browser.browser.toLowerCase() + '_' + browser.version.split('.').shift();
      let detections = 0;
      for (const result of Object.values(scraperResults.categories)) {
        for (const [browserPath, entry] of Object.entries(result.resultsByBrowser)) {
          if (browserPath.includes(browserKey)) {
            detections += entry.tests - entry.passed;
          }
        }
      }
      let detectionCount = `${numberWithCommas(detections)}`;
      row += `| [${detectionCount}](docs/scraper-detections/${scraper}.md#emulating-${browserKey.replace(
        /_/g,
        '-',
      )})`;
    }
    md += row;
  }

  md += `\n*US desktop browser market share -->* <sup name="browsershare">[1](#statcounter1)</sup> | ${browsersToProfile.browsers
    .map(x => '*' + x.averagePercent + '%*')
    .join(' | ')}`;

  fs.writeFileSync(outputFile, md);

  /////////// SCRAPER RESULT PAGES /////////////////////////////////////////////////////////////////

  const allBrowsers = await getBrowsersToProfile(1);
  for (const scraper of scrapers) {
    let page = `# ${cleanScraperName(scraper)}`;
    if (scraperDetails[scraper]?.description) {
      page += `\n${scraperDetails[scraper].description}`;
    }
    for (const browser of allBrowsers.browsers) {
      const rows = [];
      let totalTests = 0;
      let totalPassed = 0;
      let totalOmitted = 0;
      for (const detector of allDetectors) {
        if (!detector.plugin) continue;

        for (const category of detector.checkCategories ?? []) {
          const catResults = results.scrapers[scraper].categories[category];
          if (!catResults) continue;

          const browserResults = Object.entries(catResults.resultsByBrowser)
            .filter(([key]) => {
              return key.includes(
                '__' + browser.browser.toLowerCase() + '_' + browser.version.split('.').shift(),
              );
            })
            .map(x => x[1]);

          let tests = 0;
          let passed = 0;
          let omitted = 0;
          let failures = [];
          let omissions = [];
          for (const result of Object.values(browserResults)) {
            tests += result.tests;
            passed += result.passed;
            omitted += result.omitted;
            for (const failure of result.failures) {
              if (!failures.includes(failure)) failures.push(failure);
            }
            for (const omitted of result.omissions) {
              if (!omissions.includes(omitted)) omissions.push(omitted);
            }
          }
          totalOmitted += omitted;
          totalTests += tests;
          totalPassed += passed;
          let row = `${category} | ${numberWithCommas(tests)} | ${numberWithCommas(
            tests - passed - omitted,
          )} | ${numberWithCommas(omitted)} | `;
          for (const failure of failures) {
            row += `- ${failure}<br/>`;
          }
          if (omissions.length) {
            row += `<br/>--------------- Not Called -----------<br/><br/>`;
            for (const omission of omissions) {
              row += `- ${omission}<br/>`;
            }
          }
          rows.push(row);
        }
      }
      if (!totalTests) continue;

      page += `\n\n## Emulating ${decodeBrowserName(browser)}
${decodeBrowserName(browser)} has a ${browser.averagePercent}% desktop browser market share in the US as of ${allBrowsers.asOf
        .split('-')
        .reverse()
        .join('/')}.

Detection | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | ${numberWithCommas(totalTests)} | ${numberWithCommas(
        totalTests - totalPassed - totalOmitted,
      )} | ${numberWithCommas(totalOmitted)}\n`;

      page += rows.join('\n');
    }
    fs.writeFileSync(`${__dirname}/../scraper-detections/${scraper}.md`, page);
  }
}

function cleanScraperName(scraper: string) {
  if (scraperDetails[scraper]) return scraperDetails[scraper].title;
  return capitalizeFirstLetter(
    scraper
      .split('_')
      .join(' ')
      .replace(/(\d)\s(\d)/, '$1.$2')
      .replace(/(\d)\s(\w+)/, '$1 ($2)'),
  );
}

function decodeBrowserName(x: IStatcounterBrowser) {
  return x.browser + ' ' + x.version.split('.').shift();
}

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
