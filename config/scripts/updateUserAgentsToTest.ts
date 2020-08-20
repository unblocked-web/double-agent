import UserAgentsToTestGenerator from '../lib/UserAgentsToTestGenerator';

export default async function updateBrowserData() {
  const browsersToTestGenerator = new UserAgentsToTestGenerator();
  await browsersToTestGenerator.run();
  await browsersToTestGenerator.save();
}
