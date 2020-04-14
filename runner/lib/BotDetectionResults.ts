import IDirective from '../interfaces/IDirective';
import IDetectionSession from '../interfaces/IDetectionSession';
import { getUseragentPath } from './profileHelper';
import IBrowserFindings, { IBrowserPercents } from '../interfaces/IBrowserFindings';

export default class BotDetectionResults {
  private browserFindings: IBrowserFindings = {};
  private intoliBrowsers: IBrowserPercents[] = [];
  private topBrowsers: IBrowserPercents[] = [];

  public trackDirectiveResults(directive: IDirective, session: IDetectionSession) {
    if (!session.useragent) return;
    const browserPath = getUseragentPath(session.useragent);

    if (!this.browserFindings[browserPath]) {
      this.browserFindings[browserPath] = {};

      const browserFinding = this.browserFindings[browserPath];
      for (const check of session.checks) {
        let entry = browserFinding[check.category];
        if (!entry) {
          entry = {
            checks: 0,
            flagged: 0,
            flaggedChecks: [],
            botPct: 0,
          };
          browserFinding[check.category] = entry;
        }
        entry.checks += check.count;
      }

      for (const flaggedCheck of session.flaggedChecks) {
        const entry = browserFinding[flaggedCheck.category];
        entry.flagged += 1;
        entry.botPct = Math.max(entry.botPct ?? 0, flaggedCheck.pctBot);
        entry.flaggedChecks.push(flaggedCheck);
      }
    }

    const browserList = directive.testType === 'intoli' ? this.intoliBrowsers : this.topBrowsers;
    let existing = browserList.find(x => x.browser === browserPath);
    if (!existing) {
      existing = { browser: browserPath, percentUsed: 0, agentStrings: 0 };
      browserList.push(existing);
    }
    existing.agentStrings += 1;
    existing.percentUsed += directive.percentOfTraffic;
  }

  public toJSON() {
    return {
      browserFindings: this.browserFindings,
      intoliBrowsers: this.intoliBrowsers,
      topBrowsers: this.topBrowsers,
    };
  }
}
