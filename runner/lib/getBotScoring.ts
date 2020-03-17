import IRequestContext from '../interfaces/IRequestContext';

export default function getBotScoring(ctx: IRequestContext) {
  let botScores = [];
  let botReasons: string[] = [];
  for (const entry of ctx.session.flaggedChecks) {
    botScores.push(entry.pctBot);
    const botReason = `${entry.category} -> ${entry.checkName} --- ${entry.description}`;
    if (!botReasons.includes(botReason)) botReasons.push(botReason);
  }

  const botScore = Math.max(...botScores);
  const status = `[bot: ${botScore}, requests: ${ctx.session.requests.length}]`;

  const extras: any = {};
  if (ctx.url.pathname.includes('-page')) {
    extras.ids = ctx.session.identifiers.map(x => `${x.bucket}: ${x.id}`);
    extras.botReasons = botReasons;
  }

  return [status, extras];
}
