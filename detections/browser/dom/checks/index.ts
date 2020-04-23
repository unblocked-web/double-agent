import IRequestContext from '@double-agent/runner/interfaces/IRequestContext';
import IDomProfile from '../interfaces/IDomProfile';
import DomProfile from '../lib/DomProfile';
import domMatch from './domMatch';

export default async function checkProfile(ctx: IRequestContext, profile: IDomProfile) {
  const browserProfile = await DomProfile.find(ctx.session.useragent);
  if (!browserProfile) return;

  domMatch(ctx, profile, browserProfile);
}
