import fs from 'fs';
import { gunzipSync } from 'zlib';
import { lookup } from 'useragent';

const inputFilename = require.resolve('user-agents/src/user-agents.json.gz');

export default function printIntoliStats() {
  const compressedData = fs.readFileSync(inputFilename);
  const data = gunzipSync(compressedData).toString('utf8');
  const useragents = JSON.parse(data);
  const agentWeights = new GroupWeights('browsersByOs');
  const browserVersionWeights = new GroupWeights('browserVersions');
  const macBrowsers = new GroupWeights('macBrowsers');
  const winBrowsers = new GroupWeights('winBrowsers');
  const linuxBrowsers = new GroupWeights('linuxBrowsers');
  const browserWeights = new GroupWeights('browsers');
  const osWeights = new GroupWeights('os');
  for (const agent of useragents) {
    const ua = lookup(agent.userAgent);
    browserVersionWeights.track(ua.family + ' ' + ua.major, agent.weight);
    browserWeights.track(ua.family, agent.weight);
    if (ua.os.family === 'Mac OS X') macBrowsers.track(ua.family, agent.weight);
    else if (ua.os.family === 'Linux') linuxBrowsers.track(ua.family, agent.weight);
    else if (ua.os.family === 'Windows') winBrowsers.track(ua.family, agent.weight);
    osWeights.track(ua.os.family, agent.weight);
    agentWeights.track([ua.os.family, ua.os.major, ua.family, ua.major].join(' '), agent.weight);
  }

  agentWeights.print(0.5);
  browserVersionWeights.print(0.5);
  osWeights.print();
  browserWeights.print(0.5);
  macBrowsers.normalize().print();
  winBrowsers.normalize().print();
  linuxBrowsers.normalize().print();
}

class GroupWeights {
  private data: { [key: string]: number } = {};
  constructor(readonly name) {}

  track(key: string, weight: number) {
    this.data[key] = (this.data[key] ?? 0) + weight * 100;
  }

  normalize() {
    let weightSum = 0;
    for (const entry of Object.values(this.data)) {
      weightSum += entry;
    }
    for (const [key, value] of Object.entries(this.data)) {
      this.data[key] = (value / weightSum) * 100;
    }
    return this;
  }

  getSorted(minPercent = 1) {
    return Object.entries(this.data)
      .sort((a, b) => {
        return b[1] - a[1];
      })
      .filter(x => x[1] > minPercent);
  }

  print(minPercent?: number) {
    const sorted = this.getSorted(minPercent).map(x => [x[0], x[1].toFixed(2) + '%']);
    console.log(this.name, sorted);
  }
}
