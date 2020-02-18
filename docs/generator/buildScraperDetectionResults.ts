import getAllDetectors from '@double-agent/runner/lib/getAllDetectors';
import * as fs from 'fs';
import analyzeResults from '@double-agent/runner/lib/analyzeResults';

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
const outputFile = __dirname + '/../output/scraper-detection-results.md';
export default function buildScraperDetectionResults() {
  const allDetectors = getAllDetectors();
  const results = analyzeResults();

  const scrapers = Object.keys(results.scrapers).sort((a, b) => {
    const failuresA = results.scrapers[a].passed;
    const failuresB = results.scrapers[b].passed;
    return failuresA - failuresB;
  });

  /////////// OVERALL RESULTS TABLE ////////////////////////////////////////////////////////////////

  const cols = [
    'Detection',
    'Tests',
    ...scrapers.map(x => {
      const title = capitalizeFirstLetter(x);
      return `[${title}](docs/scraper-detections/${x}.md)`;
    }),
  ];

  let md = `${cols.join(' | ')}
--- | :---: |${scrapers.map(() => ' :---: ').join('|')}`;

  for (const detector of allDetectors) {
    for (const category of detector.testCategories ?? []) {
      let row = `\n${category} | `;
      if (detector.module) {
        let categoryTests = 0;
        const detections: string[] = [];
        for (const scraper of scrapers) {
          const catResults = results.scrapers[scraper].categories[category];
          if (!catResults) continue;
          if (catResults.tests > categoryTests) categoryTests = catResults.tests;
        }
        for (const scraper of scrapers) {
          const catResults = results.scrapers[scraper].categories[category];
          if (!catResults) continue;
          let detectionCount = `${numberWithCommas(catResults.tests - catResults.passed)}`;
          detections.push(
            `[${detectionCount}](docs/scraper-detections/${scraper}.md#${category
              .toLowerCase()
              .replace(/\s/g, '-')})`,
          );
        }

        row += `${numberWithCommas(categoryTests)} | ${detections.join(' | ')}`;
      }
      md += row;
    }
  }

  fs.writeFileSync(outputFile, md);

  /////////// SCRAPER RESULT PAGES /////////////////////////////////////////////////////////////////

  for (const scraper of scrapers) {
    let page = `# ${capitalizeFirstLetter(scraper)} Detections`;
    for (const detector of allDetectors) {
      if (!detector.module) continue;
      const title =
        detector.testCategories.length === 1
          ? detector.testCategories[0]
          : [detector.category, detector.testName].map(capitalizeFirstLetter).join(' ');
      page += `\n\n## ${title}
${detector.summary}\n`;
      for (const category of detector.testCategories ?? []) {
        const categoryResults = results.scrapers[scraper].categories[category];

        if (title !== category) {
          page += `\n### ${category}\n`;
        }
        if (!categoryResults) {
          page += '\nNot Implemented\n';
          break;
        }
        page += `
User Agent | Tests | Inconsistency Detected | Flagged (not Called) | Failed Tests
--- | :---: | :---: | :---: | ---
Overall | ${numberWithCommas(categoryResults.tests)} | ${numberWithCommas(
          categoryResults.tests - categoryResults.passed - categoryResults.omitted,
        )} | ${numberWithCommas(categoryResults.omitted)} |`;
        for (const [key, value] of Object.entries(categoryResults.resultsBreakdown)) {
          page += `\n${key} | ${numberWithCommas(value.tests)} | ${numberWithCommas(
            value.tests - value.passed - value.omitted,
          )} | ${numberWithCommas(value.omitted)} | `;
          for (const failure of value.failures) {
            page += `- ${failure}<br/>`;
          }
        }

        const allOmissions = new Set<string>();
        for (const value of Object.values(categoryResults.resultsBreakdown)) {
          for (const omitted of value.omissions) {
            allOmissions.add(omitted);
          }
        }
        if (allOmissions.size && categoryResults.omitted !== categoryResults.tests) {
          page += `

#### Tests/Resources not Loaded by Scraper
Test | Browsers not Running Test
--- | ---
`;
          for (const omission of allOmissions) {
            page += `${omission} | `;

            const browsers: string[] = [];
            for (const [key, value] of Object.entries(categoryResults.resultsBreakdown)) {
              if (value.omissions.includes(omission)) {
                browsers.push(key);
              }
            }
            page += browsers.join(', ') + '\n';
          }
        }
      }
    }

    fs.writeFileSync(`${__dirname}/../scraper-detections/${scraper}.md`, page);
  }
}
