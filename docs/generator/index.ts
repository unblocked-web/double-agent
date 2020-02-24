import 'source-map-support/register';
import buildDetectionsList from './buildDetectionsList';
import buildScraperDetectionResults from './buildScraperDetectionResults';
import buildReadme from './buildReadme';
import buildOsMarketShare from './buildOsMarketShare';
import buildBrowserMarketShare from './buildBrowserMarketShare';

(async function() {
  await buildDetectionsList();
  await buildScraperDetectionResults();
  await buildOsMarketShare();
  await buildBrowserMarketShare();
  await buildReadme();
})();
