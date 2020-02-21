import browserVersions from '../data/browser_version.json';
import macVersions from '../data/macos_version.json';
import osVersions from '../data/os_combined.json';
import winVersions from '../data/windows_version.json';

export default async function getBrowsersToProfile() {
  const browsers = Object.entries(browserVersions.results)
    .map(x => {
      return {
        browser: x[0].match(/(\w+)\s[\d.]+/)?.pop(),
        version: x[0].match(/\w+\s([\d.]+)/)?.pop(),
        averagePercent: averagePercent(x[1]),
      };
    })
    .sort((a, b) => {
      return b.averagePercent - a.averagePercent;
    })
    .filter(x => {
      return x.averagePercent > 1;
    });

  const macPct = averagePercent(osVersions.results['OS X']);
  const winPct = averagePercent(osVersions.results.Windows);
  delete osVersions.results['OS X'];
  delete osVersions.results.Windows;

  for (const [version, values] of Object.entries(macVersions.results)) {
    const cleanVersion = version.replace('macOS', 'OS X');
    osVersions.results[cleanVersion] = values.map(x => (Number(x) * macPct) / 100);
  }

  for (const [version, values] of Object.entries(winVersions.results)) {
    osVersions.results[version] = values.map(x => (Number(x) * winPct) / 100);
  }

  // NOTE: no support yet in browserstack for Chrome OS, so removing
  delete osVersions.results['Chrome OS'];

  const os = Object.entries(osVersions.results)
    .map(x => {
      if (x[0] === 'OS X 10.15') x[0] = 'OS X Catalina';
      const os = x[0].startsWith('Win') ? 'Windows' : x[0].startsWith('OS X') ? 'OS X' : x[0];
      return {
        os,
        version: x[0]
          .replace('Win', '')
          .replace('OS X', '')
          .trim(),
        averagePercent: averagePercent(x[1]),
      };
    })
    .sort((a, b) => {
      return b.averagePercent - a.averagePercent;
    })
    .filter(x => {
      return x.averagePercent > 5;
    });

  console.log('Browsers > 1%', browsers);
  console.log('Operating Systems > 5%, not Chrome OS', os);
  return {
    browsers,
    os,
  };
}

function averagePercent(counts: string[]) {
  const avg = Math.round((10 * counts.reduce((tot, vl) => tot + Number(vl), 0)) / counts.length);
  return avg / 10;
}
