import IAssignment from '@double-agent/runner/interfaces/IAssignment';
import IDetectionSession from '@double-agent/runner/interfaces/IDetectionSession';
import IBrowserFindings, { IBrowserPercents } from '@double-agent/runner/interfaces/IBrowserFindings';
import { getProfileDirNameFromUseragent } from '@double-agent/profiler';

export default class BotDetectionResults {
  private browserFindings: IBrowserFindings = {};
  private intoliBrowsers: IBrowserPercents[] = [];
  private topBrowsers: IBrowserPercents[] = [];

  public trackAssignmentResults(assignment: IAssignment, session: IDetectionSession) {
    if (!session.useragent) return;
    const profileDirName = getProfileDirNameFromUseragent(session.useragent);

    if (!this.browserFindings[profileDirName]) {
      this.browserFindings[profileDirName] = {};

      const browserFinding = this.browserFindings[profileDirName];
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
        // entry.flaggedChecks.push(flaggedCheck);
      }
    }

    const browserList = assignment.testType === 'intoli' ? this.intoliBrowsers : this.topBrowsers;
    let existing = browserList.find(x => x.browser === profileDirName);
    if (!existing) {
      existing = { browser: profileDirName, percentUsed: 0, agentStrings: 0 };
      browserList.push(existing);
    }
    existing.agentStrings += 1;
    existing.percentUsed += assignment.percentOfTraffic;
  }

  public toJSON() {
    return {
      browserFindings: this.browserFindings,
      intoliBrowsers: this.intoliBrowsers,
      topBrowsers: this.topBrowsers,
    };
  }
}