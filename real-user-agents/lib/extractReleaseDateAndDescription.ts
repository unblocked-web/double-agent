import Dashify from 'dashify';
import { IReleaseDates } from '../interfaces/ISlabData';

export default function extractReleaseDateAndDescription(
  id: string,
  name: string,
  descriptions: { [key: string]: string },
  releaseDates: IReleaseDates,
) {
  const slug = Dashify(name);

  const description = descriptions[id] || descriptions[slug];
  if (!description) throw new Error(`Missing description for ${id}`);

  const releaseDate = releaseDates[id] || releaseDates[slug];
  if (!releaseDate) throw new Error(`Missing releaseDate for ${id}`);

  return [releaseDate, description];
}
