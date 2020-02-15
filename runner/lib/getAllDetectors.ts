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

export default function getAllDetectors() {
  const detectors: IDetectorModule[] = [];
  const detectionsDir = __dirname + '/../../detections';
  for (const category of fs.readdirSync(detectionsDir)) {
    if (category === '.DS_Store') continue;
    if (!fs.statSync(`${detectionsDir}/${category}`).isDirectory()) continue;
    for (const testName of fs.readdirSync(`${detectionsDir}/${category}`)) {
      if (testName === '.DS_Store') continue;
      if (!fs.statSync(`${detectionsDir}/${category}/${testName}`).isDirectory()) continue;
      // if (testName !== 'headers') continue
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
    else if (b.module) return 1;
    return a.category.localeCompare(b.category);
  });
  console.log(
    'Test Suites Activated',
    detectors.map(x => `${x.module ? '✓' : 'x'} ${x.category}-${x.testName} - ${x.summary}`),
  );
  return detectors;
}
