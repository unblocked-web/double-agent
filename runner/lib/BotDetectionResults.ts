import IDetectorModule from '../interfaces/IDetectorModule';
import IDirective from '../interfaces/IDirective';
import IDetectionSession from '../interfaces/IDetectionSession';
import IFlaggedCheck from '../interfaces/IFlaggedCheck';

export default class BotDetectionResults {
  private intoliStats: IBotCategoryStats = {};
  private topBrowserStats: IBotCategoryStats = {};
  private categorySources: ICategorySources = {};

  constructor(detectors: IDetectorModule[]) {
    for (const detector of detectors) {
      if (!detector.plugin) continue;
      for (const category of detector.checkCategories) {
        if (this.categorySources[detector.layer])
          this.categorySources[detector.layer].push(category);
        else this.categorySources[detector.layer] = [category];
        this.intoliStats[category] = {
          botPct: 0,
          totalFlags: 0,
          aggregateBotPct: 0,
          flaggedChecks: [],
        };
        this.topBrowserStats[category] = {
          botPct: 0,
          totalFlags: 0,
          aggregateBotPct: 0,
          flaggedChecks: [],
        };
      }
    }
  }

  public trackDirectiveResults(directive: IDirective, session: IDetectionSession) {
    for (const finding of session.flaggedChecks) {
      let stats: IBotFindings;
      if (directive.testType === 'intoli') {
        stats = this.intoliStats[finding.category];
      } else {
        stats = this.topBrowserStats[finding.category];
      }
      if (!stats) {
        console.log('No category!!', finding);
      }
      stats.botPct = Math.max(finding.pctBot, stats.botPct);
      stats.totalFlags += 1;
      stats.aggregateBotPct += finding.pctBot;

      let existing = stats.flaggedChecks.find(
        x => x.category === finding.category && x.value === finding.value,
      );
      const agent = session.parsedUseragent.family + ' ' + session.parsedUseragent.major;
      if (!existing) {
        existing = finding as IFlaggedCheckGroup;
        existing.seenCount = 0;
        existing.seenWithAgents = [];
        stats.flaggedChecks.push(existing);
      }
      existing.seenCount += 1;
      if (!existing.seenWithAgents.includes(agent)) {
        existing.seenWithAgents.push(agent);
      }
    }
  }

  public toJSON() {
    return {
      intoli: this.intoliStats,
      topBrowsers: this.topBrowserStats,
      categorySources: this.categorySources,
    };
  }
}

interface IBotCategoryStats {
  [category: string]: IBotFindings;
}

interface IBotFindings {
  botPct: number;
  totalFlags: number;
  aggregateBotPct: number;
  flaggedChecks: IFlaggedCheckGroup[];
}

interface ICategorySources {
  [layer: string]: string[];
}

interface IFlaggedCheckGroup extends IFlaggedCheck {
  seenCount: number;
  seenWithAgents: string[];
}
