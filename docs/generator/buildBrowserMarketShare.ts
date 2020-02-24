import getBrowsersToProfile from '@double-agent/profiler/lib/getBrowsersToProfile';
import fs from 'fs';

const header = `Browser | Market Share
--- | :---:`;

const outputFile = __dirname + '/../output/browser-market-share.md';
export default async function buildOsMarketShare() {
  const { browsers } = await getBrowsersToProfile();
  let md = header;
  let pct = 0;
  for (const browser of browsers) {
    md += `\n${browser.browser} ${browser.version.split('.').shift()} | ${browser.averagePercent}%`;
    pct += browser.averagePercent;
  }
  md += `\nTotal | ${Math.round(pct * 10) / 10}%`;
  fs.writeFileSync(outputFile, md);
}
