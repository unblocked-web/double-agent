import OsGenerator from '../lib/OsGenerator';
import BrowserGenerator from '../lib/BrowserGenerator';
import BrowsersToTestGenerator from '../lib/BrowsersToTestGenerator';

export default async function updateBrowserData() {
  const osGenerator = new OsGenerator();
  await osGenerator.run();
  await osGenerator.save();

  const browserGenerator = new BrowserGenerator();
  await browserGenerator.run();
  await browserGenerator.save();

  const browsersToTestGenerator = new BrowsersToTestGenerator();
  await browsersToTestGenerator.run();
  await browsersToTestGenerator.save();
}
