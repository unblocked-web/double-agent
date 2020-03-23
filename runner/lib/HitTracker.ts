import moment, { Moment } from 'moment';
import IRequestContext from '../interfaces/IRequestContext';
import { maxBotPctByCategory } from './flagUtils';

export default class HitTracker {
  private hits: IHit[] = [];

  constructor(readonly botCheckCategories: string[]) {}

  public getSince(time: Moment) {
    const botScoreByCategory: {
      [category: string]: { sum: number; max: number; avg: number };
    } = {};

    const hits = this.hits.filter(x => moment(x.time).isSameOrAfter(time));

    for (const hit of hits) {
      for (const [cat, botPct] of Object.entries(hit.botScoreByCategory)) {
        if (!botScoreByCategory[cat]) botScoreByCategory[cat] = { sum: 0, max: 0, avg: 0 };
        botScoreByCategory[cat].sum += botPct;
        botScoreByCategory[cat].max = Math.max(botScoreByCategory[cat].max, botPct);
      }
    }

    for (const entry of Object.values(botScoreByCategory)) {
      entry.avg = Math.round(entry.sum / hits.length);
    }
    return {
      botScoreByCategory,
      hits: hits.length,
    };
  }

  public increment(ctx: IRequestContext) {
    const risk = this.recordHit(ctx);
    for (const [category, pctBot] of maxBotPctByCategory(ctx)) {
      risk.botScoreByCategory[category] += pctBot;
    }
  }

  private recordHit(ctx: IRequestContext): IHit {
    const risk = {
      sessionid: ctx.session.id,
      time: ctx.requestDetails.time,
      botScoreByCategory: {},
    };
    for (const cat of this.botCheckCategories) {
      risk.botScoreByCategory[cat] = 0;
    }
    this.hits.push(risk);
    return risk;
  }
}

interface IHit {
  time: Date;
  sessionid: string;
  botScoreByCategory: { [category: string]: number };
}
