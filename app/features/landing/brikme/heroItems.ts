/** Assets shown in the hero carousel (labels live apart from the 3D code so the page stays light). */
export type HeroItem = { key: string; title: string; sub: string };

export const HERO_ITEMS: readonly HeroItem[] = [
  { key: 'car', title: 'Autos de lujo', sub: 'Superdeportivos y flotas premium' },
  { key: 'tower', title: 'Real Estate Dubái', sub: 'Torres y hoteles en zonas prime' },
  { key: 'watch', title: 'Relojes de colección', sub: 'Alta relojería como activo' },
  { key: 'turbine', title: 'Energía renovable', sub: 'Infraestructura eólica y solar' },
  { key: 'gold', title: 'Minerales', sub: 'Materias primas tokenizadas' },
  { key: 'villa', title: 'Residencial', sub: 'Villas y casas de alto valor' },
];

/** Full-detail model of an asset (meshopt-packed original), by model file name. */
export const heroModelUrl = (name: string) => `/models/hq/brikme-${name}.glb`;
