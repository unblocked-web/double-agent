import Dashify from 'dashify';

export default function extractReleaseDateAndDescription(name: string, id: string, extras: any) {
  const slug = Dashify(name);
  const extra = extras[slug];

  if (!extra) {
    throw new Error(`Missing extra data for ${slug}`);
  }

  const releaseDate = extra.releaseDates ? extra.releaseDates[id] : extra.releaseDate;
  if (!releaseDate) {
    throw new Error(`${slug} is missing release date for ${id}`);
  }

  const description = extra.descriptions ? extra.descriptions[id] || extra.description : extra.description;

  return [releaseDate, description];
}
