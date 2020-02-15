import buildDetectionsList from './buildDetectionsList';
import buildScraperDetectionResults from './buildScraperDetectionResults';
import buildReadme from './buildReadme';

(async function() {
  await buildDetectionsList();
  await buildScraperDetectionResults();
  await buildReadme();
})();
