import IDetectorModule from '../interfaces/IDetectorModule';
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

export const stackOrder = ['tcp', 'tls', 'ip', 'http', 'browser', 'user', 'visits'];

export const detectionsDir = __dirname + '/../../detections';

export default function getAllDetectors(includeRepeatVisitTests = true, print = false) {
  const detectors: IDetectorModule[] = [];
  let filter;

  if (process.argv.length > 2) {
    filter = process.argv
      .slice(2)
      .map(x => x.trim().split(','))
      .reduce((tot, x) => {
        tot.push(...x);
        return tot;
      }, [])
      .filter(Boolean);
  }

  for (const layer of fs.readdirSync(detectionsDir)) {
    if (layer === '.DS_Store') continue;
    if (!fs.statSync(`${detectionsDir}/${layer}`).isDirectory()) continue;
    for (const name of fs.readdirSync(`${detectionsDir}/${layer}`)) {
      if (name === '.DS_Store') continue;
      if (!fs.statSync(`${detectionsDir}/${layer}/${name}`).isDirectory()) continue;
      if (filter && !filter.includes(name) && !`${layer}/${name}`.includes(filter)) continue;
      if (!includeRepeatVisitTests && layer === 'visits') continue;

      const entry = {
        layer,
        name,
        dir: `${detectionsDir}/${layer}/${name}`,
      } as IDetectorModule;

      try {
        const Plugin = require(`${detectionsDir}/${layer}/${name}`)?.default;
        if (Plugin) entry.plugin = new Plugin();
      } catch (err) {}

      try {
        const packageJson = require(`${detectionsDir}/${layer}/${name}/package.json`);
        if (packageJson) {
          entry.summary = packageJson.description;
          entry.checkCategories = packageJson['checkCategories'] ?? [titleCase(`${layer} ${name}`)];
        }
        detectors.push(entry);
      } catch (err) {}
    }
  }

  detectors.sort((a, b) => {
    if (a.plugin && !b.plugin) return -1;
    else if (b.plugin && !a.plugin) return 1;

    const stackDiff = stackOrder.indexOf(a.layer) - stackOrder.indexOf(b.layer);
    if (stackDiff !== 0) return stackDiff;

    return a.layer.localeCompare(b.layer);
  });

  if (print) {
    console.log(
      'Detection Suites Activated',
      detectors.map(x => `${x.plugin ? '✓' : 'x'} ${x.layer}-${x.name} - ${x.summary}`),
    );
  }

  return detectors;
}
