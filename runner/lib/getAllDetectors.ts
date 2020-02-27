import IDetectorModule from './IDetectorModule';
import fs from 'fs';

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function titleCase(str: string) {
  return str
    .replace('-', ' ')
    .replace('_', ' ')
    .split(' ')
    .map(capitalizeFirstLetter)
    .join(' ');
}

const stackOrder = ['tcp', 'tls', 'ip', 'http', 'browser', 'user', 'end2end'];

export const detectionsDir = __dirname + '/../../detections';

export default function getAllDetectors(print = false) {
  const detectors: IDetectorModule[] = [];
  let testsFilter;

  if (process.argv.length > 2) {
    testsFilter = process.argv
      .slice(2)
      .map(x => x.trim().split(','))
      .reduce((tot, x) => {
        tot.push(...x);
        return tot;
      }, [])
      .filter(Boolean);
  }
  for (const category of fs.readdirSync(detectionsDir)) {
    if (category === '.DS_Store') continue;
    if (!fs.statSync(`${detectionsDir}/${category}`).isDirectory()) continue;
    for (const testName of fs.readdirSync(`${detectionsDir}/${category}`)) {
      if (testName === '.DS_Store') continue;
      if (!fs.statSync(`${detectionsDir}/${category}/${testName}`).isDirectory()) continue;
      if (testsFilter && !testsFilter.includes(testName) && !`${category}/${testName}`.includes(testsFilter)) continue;

      const entry = {
        category,
        testName,
      } as IDetectorModule;
      try {
        const Module = require(`${detectionsDir}/${category}/${testName}/detector`)?.default;
        if (Module) entry.module = new Module();
      } catch (err) {}

      try {
        const packageJson = require(`${detectionsDir}/${category}/${testName}/package.json`);
        if (packageJson) {
          entry.summary = packageJson.description;
          entry.testCategories = packageJson['test-categories'] ?? [
            titleCase(`${category} ${testName}`),
          ];
        }
        detectors.push(entry);
      } catch (err) {}
    }
  }

  detectors.sort((a, b) => {
    if (a.module && !b.module) return -1;
    else if (b.module && !a.module) return 1;

    const stackDiff = stackOrder.indexOf(a.category) - stackOrder.indexOf(b.category);
    if (stackDiff !== 0) return stackDiff;

    return a.category.localeCompare(b.category);
  });

  if (print) {
    console.log(
      'Test Suites Activated',
      detectors.map(x => `${x.module ? '✓' : 'x'} ${x.category}-${x.testName} - ${x.summary}`),
    );
  }

  return detectors;
}
