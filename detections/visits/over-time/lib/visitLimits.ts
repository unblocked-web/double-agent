import IVisitLimit from '../interfaces/IVisitLimit';
import IVisitAllowance from '../interfaces/IVisitAllowance';

const secsIn10Mins = 60 * 10;
export function getVisitLimit(minutePeriod: 1 | 10, visits: number) {
  const allowance = visitLimits.find(x => x.minutes === minutePeriod);
  let thresholdAllowance: IVisitLimit = {
    visits: 0,
    pctBot: 0,
    categoryMultiplier: 0,
  };
  if (!allowance) return thresholdAllowance;
  for (const entry of allowance.limits) {
    if (visits >= entry.visits) {
      thresholdAllowance = entry;
    } else {
      break;
    }
  }
  return thresholdAllowance;
}

const visitLimits = [
  {
    minutes: 1,
    periodName: 'Hits Per Minute',
    limits: [
      {
        visits: 10,
        pctBot: 75,
        categoryMultiplier: 1.25,
      },
    ],
  },
  {
    minutes: 10,
    periodName: 'Hits Per 10 Minutes',
    limits: [
      {
        visits: 20, // visit every 30 seconds
        pctBot: 60,
        categoryMultiplier: 1.1,
      },
      {
        visits: secsIn10Mins / 10, // visit every 10 seconds
        pctBot: 80,
        categoryMultiplier: 1.15,
      },
      {
        visits: secsIn10Mins / 5, // visit every 5 seconds
        pctBot: 90,
        categoryMultiplier: 1.2,
      },
      {
        visits: secsIn10Mins / 1, // visit every second
        pctBot: 100,
        categoryMultiplier: 1.25,
      },
    ],
  },
] as IVisitAllowance[];

export default visitLimits;
