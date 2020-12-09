import buildPluginsList from './buildPluginsList';
import buildReadme from './buildReadme';

(async function() {
  await buildPluginsList('collect');
  await buildPluginsList('analyze');
  await buildReadme();
})();
