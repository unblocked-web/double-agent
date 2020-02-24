import getBrowsersToProfile from '@double-agent/profiler/lib/getBrowsersToProfile';
import fs from 'fs';

const header = `OS | Market Share
---  | :---:`;

const outputFile = __dirname + '/../output/os-market-share.md';
export default async function buildOsMarketShare() {
  const { os } = await getBrowsersToProfile();
  let md = header;
  let pct = 0;
  for (const opSys of os) {
    md += `\n${opSys.os} ${opSys.version} | ${opSys.averagePercent}%`;
    pct += opSys.averagePercent
  }
  md += `\nTotal | ${Math.round(pct * 10) / 10}%`;
  fs.writeFileSync(outputFile, md);
}
