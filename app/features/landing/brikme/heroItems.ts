/**
 * Assets shown in the hero carousel (kept apart from the 3D code so the page stays light).
 * Only the keys live here: titles and subtitles are translated in the landing
 * dictionary, under `hero.items.<key>.title` / `.sub`.
 */
export type HeroItem = { key: string };

export const HERO_ITEMS: readonly HeroItem[] = [
  { key: 'car' },
  { key: 'tower' },
  { key: 'watch' },
  { key: 'turbine' },
  { key: 'gold' },
  { key: 'villa' },
];

/** Full-detail model of an asset (meshopt-packed original), by model file name. */
export const heroModelUrl = (name: string) => `/models/hq/brikme-${name}.glb`;
