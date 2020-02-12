import readJa3s from './readJa3s';

const stats = readJa3s();

export default function(ja3Md5: string) {
  const jaStats = stats[ja3Md5] ?? { count: 0, userAgents: [] };
  const operatingSystems = new Map<string, string[]>();
  const browsers = new Map<string, string[]>();
  for (const agent of jaStats.userAgents) {
    if (agent.os === 'Other') continue;
    const os = operatingSystems.get(agent.os) ?? [];
    if (!os.includes(agent.osv)) os.push(agent.osv);
    operatingSystems.set(agent.os, os);
    const br = browsers.get(agent.browser) ?? [];
    if (!br.includes(agent.browserv)) br.push(agent.browserv);
    browsers.set(agent.browser, br);
  }
  return {
    ...jaStats,
    operatingSystems,
    browsers,
  };
}
