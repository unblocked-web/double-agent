import 'source-map-support/register';
import buildDetectionsList from './buildDetectionsList';
import buildReadme from './buildReadme';

(async function() {
  await buildDetectionsList();
  await buildReadme();
})();
