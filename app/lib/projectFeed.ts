import { useSyncExternalStore } from 'react';
import { RWA_ASSETS, type AssetCategory, type RwaAsset } from '~/data';
import { slugify } from '~/lib/navigation';
import type { MediaItem, PostComment } from '~/lib/social/types';

// Project feeds, shared across the app: each project's Feed tab reads and
// writes its own posts here, and the global Feed (pages/GlobalFeed) shows the
// milestone ("hito") posts of every live project. Kept in memory — posts,
// likes, comments and uploads reset on reload. Demo data: in live mode the
// social screens read the API through a SocialSource (lib/social).

/** A post as stored for one project (demo store). */
export type ProjectPost = {
  id: string;
  /** Epoch ms, used to sort the global feed. */
  ts?: number;
  date: string;
  milestone: boolean;
  text: string;
  media?: MediaItem[];
  /** Older posts may carry a single image instead of `media`. */
  img?: string;
  likes: number;
  liked: boolean;
  comments: PostComment[];
};

type FeedAsset = Pick<RwaAsset, 'stage' | 'sold' | 'feedEnabled'>;
type IssuerAsset = Pick<RwaAsset, 'issuer' | 'company'>;

// A project has a feed once it's running, fully funded, or was explicitly
// flagged early (feedEnabled) — some projects start building/buying the
// underlying asset before their raise closes and want to post progress
// during that window too.
export const isFeedLive = (a: FeedAsset): boolean => a.stage === 'Operativo' || a.sold >= 100 || a.feedEnabled === true;

// Posts carry `media`; older ones may still use a single `img` field.
export const postMedia = (post: Pick<ProjectPost, 'media' | 'img'>): MediaItem[] =>
  post.media || (post.img ? [{ id: post.img, type: 'image', url: post.img }] : []);

export const issuerNameOf = (a: IssuerAsset): string => (a.issuer === 'keychain' ? 'KEYCHAIN' : (a.company || ''));

/** The design branch's developer-only QA fixtures (category "QA"); our catalog has none. */
export const isQaFixture = (a: Pick<RwaAsset, 'cat'>): boolean => String(a.cat) === 'QA';

/** Stable URL slug for a company name (`/empresas/<slug>`; same rule the API uses for issuer slugs). */
export const companySlug = (name: string): string => slugify(name);

// ─── Seed posts ───────────────────────────────────────────────────────────────
// Deterministic per asset so every project reads a little differently and the
// global feed interleaves them by date instead of stacking identical posts.
const TODAY = Date.UTC(2026, 5, 13);
const DAY = 86400000;
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const fmtPostDate = (ts: number): string => {
  const d = new Date(ts);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

// Short pan/zoom clips over each category's own photos (public/videos).
const CAT_VIDEO: Partial<Record<AssetCategory, string>> = {
  Autos: '/videos/autos.webm', Campos: '/videos/campos.webm', Drones: '/videos/drones.webm',
  Inmuebles: '/videos/inmuebles.webm', Edificios: '/videos/edificios.webm',
};

const CAT_UPDATE: Partial<Record<AssetCategory, readonly [string, string]>> = {
  Autos:     ['Mantenimiento programado completado en toda la flota. Todas las unidades vuelven a operar esta semana.', 'Así quedó la flota después del service anual 🚗'],
  Campos:    ['Avanza la cosecha: ya levantamos el 60% del lote con rindes por encima del promedio de la zona.', 'Recorrido por el campo esta mañana 🌾'],
  Drones:    ['Sumamos 3 nuevos contratos de servicio. Los equipos ya están volando en las zonas asignadas.', 'Vuelo de prueba de los equipos nuevos 🛸'],
  Inmuebles: ['Terminamos la renovación de las unidades: pisos, cocina y climatización nuevos.', 'Así quedaron las unidades renovadas 🏠'],
  Edificios: ['Se renovaron los contratos de los inquilinos principales por 3 años más. Ocupación actual: 94%.', 'Recorrido por las oficinas renovadas 🏢'],
};
const DEFAULT_UPDATE = ['Avanzamos con el plan operativo según lo previsto para este trimestre.', 'Avances del proyecto'] as const;

// Category milestones, posted with a photo or the category video.
const CAT_HITOS: Partial<Record<AssetCategory, readonly string[]>> = {
  Autos:     ['¡Toda la flota ya está operando en plataforma! Primer mes completo con 100% de las unidades activas.', 'Superamos los 50.000 viajes realizados desde el lanzamiento 🎉', 'Renovamos el seguro full cobertura de toda la flota por 12 meses.'],
  Campos:    ['¡Terminamos la siembra de la campaña 2026! Todo el lote quedó implantado en fecha.', 'Cosecha finalizada con un rinde 12% por encima de lo proyectado 🌾', 'Firmamos el contrato de venta anticipada de la producción con la exportadora.'],
  Drones:    ['Superamos las 10.000 hectáreas relevadas con la flota 🛸', 'Obtuvimos la habilitación de ANAC para operar en zona ampliada.', 'Incorporamos 5 drones nuevos a la flota, financiados con la última ronda.'],
  Inmuebles: ['¡Ocupación completa! Todas las unidades están alquiladas este mes 🏠', 'Finalizó la renovación integral y ya recibimos a los primeros inquilinos.', 'La tasación independiente valuó el inmueble un 8% por encima de la compra.'],
  Edificios: ['Firmamos contrato con un nuevo inquilino corporativo por 5 años 🏢', 'El edificio obtuvo la certificación de eficiencia energética LEED.', 'Ocupación del 96%: el nivel más alto desde la tokenización.'],
};
const DEFAULT_HITOS = ['Auditoría operativa del trimestre sin observaciones. El informe completo está en Documentos.', 'Publicamos el reporte trimestral con todos los indicadores del proyecto.', 'Completamos la verificación legal y registral del activo.'];
const DIST_TEXT: ReadonlyArray<(m: string, h: number) => string> = [
  (m, h) => `Se distribuyeron $${m} USDC entre ${h} holders. Gracias por confiar en el proyecto.`,
  (m, h) => `💸 Distribución mensual enviada: $${m} USDC repartidos entre ${h} holders.`,
  (m, h) => `Ya está en sus wallets la renta del mes: $${m} USDC para ${h} holders.`,
];

const COMMENTERS = ['Lucía M.', 'Martín G.', 'Sofía R.', 'Diego P.', 'Carla V.', 'Tomás L.'];
const COMMENTS = ['¡Llegó puntual como siempre! 👏', 'Excelente noticia, gracias por la transparencia.', '¿Cuándo es la próxima distribución?', 'Muy buen avance 🙌', 'Se ve impecable.'];

const at = <T>(list: readonly T[], i: number): T => list[((i % list.length) + list.length) % list.length] as T;

const photo = (src: string, n: number | string): MediaItem => ({ id: `${src}#${n}`, type: 'image', url: src });

// Every local photo per category, so carousel posts can show more shots
// than a single project has.
let catPhotos: Map<AssetCategory, string[]> | null = null;
const photosOfCat = (cat: AssetCategory): string[] => {
  if (!catPhotos) {
    const map = new Map<AssetCategory, string[]>();
    RWA_ASSETS.forEach(a => (a.images.length ? a.images : [a.img]).forEach(src => {
      const list = map.get(a.cat) ?? [];
      if (!map.has(a.cat)) map.set(a.cat, list);
      if (!list.includes(src)) list.push(src);
    }));
    catPhotos = map;
  }
  return catPhotos.get(cat) ?? [];
};

function seedPosts(a: RwaAsset): ProjectPost[] {
  const imgs = a.images?.length ? a.images : [a.img];
  const pic = (i: number) => photo(at(imgs, i), i);
  // n distinct photos: the project's own first, then its category's,
  // rotated per project so neighbours in the feed don't repeat the same set.
  const carousel = (n: number, from = 0) => {
    const pool = photosOfCat(a.cat);
    const shift = a.id % (pool.length || 1);
    const rotated = pool.slice(shift).concat(pool.slice(0, shift));
    return [...new Set([...imgs.slice(from), ...rotated])].slice(0, n).map((src, i) => photo(src, `c${from}-${i}`));
  };
  const video = CAT_VIDEO[a.cat];
  const [updateText, videoText] = CAT_UPDATE[a.cat] || DEFAULT_UPDATE;
  const monthly = Math.round((a.valuation * a.apy) / 100 / 12);
  const holders = Math.max(12, Math.round((a.totalTokens * a.sold) / 100 / 24));
  // Each post type gets its own per-project offset so the global feed mixes
  // distributions, videos and funding milestones instead of stacking one kind.
  const tsAt = (days: number, mult: number) => TODAY - (days + ((a.id * mult) % 17)) * DAY;
  const withVideo = !!video && a.id % 2 === 0;
  const pick = (k: number) => at(COMMENTERS, a.id + k);
  const hitos = CAT_HITOS[a.cat] || DEFAULT_HITOS;
  const hito = at(hitos, a.id);

  const posts: Array<Omit<ProjectPost, 'date' | 'liked' | 'comments'> & { comments?: PostComment[] }> = [
    { id: `${a.id}-1`, ts: tsAt(2, 7), milestone: true,
      text: at(DIST_TEXT, a.id)(monthly.toLocaleString('en-US'), holders),
      media: [pic(0)], likes: 18 + (a.id % 23),
      comments: [{ id: `${a.id}-1c`, date: fmtPostDate(tsAt(2, 7)), author: pick(0), text: at(COMMENTS, a.id), isIssuer: false }] },
    { id: `${a.id}-2`, ts: tsAt(6, 5), milestone: false, text: updateText,
      media: carousel(3, 1), likes: 6 + (a.id % 9) },
    // Category milestone: a 3–5 photo carousel, or the category video
    // followed by two photos (mixed carousel).
    { id: `${a.id}-3`, ts: tsAt(0, 3), milestone: true,
      text: withVideo ? `${hito} ${videoText}` : hito,
      media: withVideo && video
        ? [{ id: `${a.id}-v`, type: 'video', url: video }, ...carousel(2)]
        : carousel(3 + (a.id % 3)),
      likes: 12 + (a.id % 17) },
    { id: `${a.id}-4`, ts: tsAt(4, 11), milestone: true,
      text: a.sold >= 100 ? '¡Ronda cerrada! El proyecto se financió al 100%.' : `El proyecto alcanzó el ${a.sold}% de financiación.`,
      media: a.id % 3 === 1 ? carousel(3) : [pic(3)], likes: 20 + (a.id % 13) },
    { id: `${a.id}-5`, ts: tsAt(30, 2), milestone: false, text: 'Se firmó contrato de operación por 24 meses adicionales.',
      media: [], likes: 4 + (a.id % 7) },
  ];
  return posts.map(p => ({ ...p, date: fmtPostDate(p.ts ?? TODAY), liked: false, comments: p.comments || [] }));
}

// ─── Store ────────────────────────────────────────────────────────────────────
const byAsset = new Map<number, ProjectPost[]>();
const assetsById = new Map<number, RwaAsset>();
const listeners = new Set<() => void>();
let version = 0;

const postsOf = (a: RwaAsset): ProjectPost[] => {
  assetsById.set(a.id, a);
  const existing = byAsset.get(a.id);
  if (existing) return existing;
  const seeded = seedPosts(a);
  byAsset.set(a.id, seeded);
  return seeded;
};

/** Notifies every reader of the demo store (posts, likes, comments, follows, reviews). */
export function emitFeedStore(): void {
  version += 1;
  listeners.forEach(fn => fn());
}

export function subscribeFeedStore(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export const feedStoreVersion = (): number => version;

const useVersion = () => useSyncExternalStore(subscribeFeedStore, feedStoreVersion, feedStoreVersion);

export type PostsUpdater = ProjectPost[] | ((posts: ProjectPost[]) => ProjectPost[]);

export function setProjectPosts(a: RwaAsset, updater: PostsUpdater): void {
  assetsById.set(a.id, a);
  byAsset.set(a.id, typeof updater === 'function' ? updater(postsOf(a)) : updater);
  emitFeedStore();
}

/** Posts of one project, seeding them on first read (no hook: for non-React readers). */
export const projectPostsOf = (a: RwaAsset): ProjectPost[] => postsOf(a);

/** Finds a stored post by id among the projects read so far. */
export function findProjectPost(postId: string): { asset: RwaAsset; post: ProjectPost } | null {
  for (const [assetId, posts] of byAsset) {
    const post = posts.find(p => p.id === postId);
    const asset = assetsById.get(assetId);
    if (post && asset) return { asset, post };
  }
  return null;
}

// [posts, setPosts] for one project — same shape as useState.
export function useProjectPosts(a: RwaAsset): [ProjectPost[], (updater: PostsUpdater) => void] {
  useVersion();
  return [postsOf(a), (updater) => setProjectPosts(a, updater)];
}

// ─── Featured profiles ────────────────────────────────────────────────────────
// One profile per issuer with a live feed (the author shown on its posts).
const PROFILE_BIO: Record<string, string> = {
  KEYCHAIN:   'Plataforma de tokenización de activos reales. Proyectos propios en autos, campos, drones e inmuebles.',
  AutoMax:    'Flotas de vehículos tokenizadas operando en ride-hailing y logística urbana.',
  CarRent:    'Renta premium de vehículos de colección y alta gama para eventos.',
  AgroToken:  'Campos productivos de soja, maíz y cítricos en la zona núcleo argentina.',
  VitivinARG: 'Viñedos y bodegas boutique de altura, con exportación directa.',
  DroneAgro:  'Drones agrícolas para pulverización y relevamiento de precisión.',
  SkyOps:     'Operaciones con drones para inspección, seguridad y producciones audiovisuales.',
  PropChain:  'Oficinas y edificios corporativos tokenizados en España y LATAM.',
  EuroRent:   'Apartamentos turísticos y de larga estadía en las principales ciudades de Europa.',
  HomeChain:  'Residencias premium en alquiler en Buenos Aires, Miami y Nueva York.',
  LogiCorp:   'Centros logísticos y de distribución last-mile pre-alquilados.',
};

// Owner (founder) behind each company: the personal account the company
// profile can switch to. Demo data until issuers have real accounts.
const PROFILE_OWNER: Record<string, string> = {
  KEYCHAIN:   'Andrés Quinteros',
  AutoMax:    'Lucía Fernández',
  CarRent:    'Martín Salvatierra',
  AgroToken:  'Joaquín Pereyra',
  VitivinARG: 'Valentina Ocampo',
  DroneAgro:  'Tomás Giménez',
  SkyOps:     'Camila Rossi',
  PropChain:  'Javier Morales',
  EuroRent:   'Elena García',
  HomeChain:  'Sofía Benítez',
  LogiCorp:   'Diego Herrera',
};
const OWNER_GRADIENTS = [
  'linear-gradient(135deg, #f97316, #ec4899)', 'linear-gradient(135deg, #10b981, #3b82f6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)', 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  'linear-gradient(135deg, #84cc16, #0ea5e9)', 'linear-gradient(135deg, #e11d48, #7c3aed)',
];

export type DemoPerson = { name: string; initial: string; handle: string; gradient: string; bio: string };

export type DemoCompany = {
  name: string;
  handle: string;
  cover: string;
  bio: string;
  verified: boolean;
  /** Projects with a live feed. */
  projects: number;
  /** Followers, not counting the signed-in user. */
  followers: number;
  owner: DemoPerson;
  liveAssets: RwaAsset[];
  /** Every project this issuer has, including ones still raising. */
  allAssets: RwaAsset[];
};

function ownerOf(company: string): DemoPerson {
  const name = PROFILE_OWNER[company] || `Equipo ${company}`;
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return {
    name,
    initial: name.slice(0, 1).toUpperCase(),
    handle: name.toLowerCase().normalize('NFD').replace(/[^a-z]/g, ''),
    gradient: at(OWNER_GRADIENTS, hash),
    bio: `Fundador y CEO de ${company}.`,
  };
}

// Projects shown on an issuer's profile: its real ones, plus the QA fixture
// the signed-in user owns (isMine) so "my company" has a profile to open.
const profileAssets = (name: string) => RWA_ASSETS.filter(a => issuerNameOf(a) === name && (!isQaFixture(a) || a.isMine));

function buildProfile(name: string, liveAssets: RwaAsset[], allAssets: RwaAsset[]): DemoCompany {
  const investors = liveAssets.reduce((s, a) => s + Math.round((a.totalTokens * a.sold) / 100 / 24), 0);
  const first = liveAssets[0] ?? allAssets[0];
  return {
    name,
    handle: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    cover: first ? (first.images.length ? first.images : [first.img])[0] ?? first.img : '',
    bio: PROFILE_BIO[name] || `Emisor de ${allAssets.length} proyectos tokenizados en KEYCHAIN.`,
    verified: name === 'KEYCHAIN' || allAssets.some(a => a.issuer === 'verified' || a.issuer === 'keychain'),
    projects: liveAssets.length,
    followers: investors * 7,
    owner: ownerOf(name),
    liveAssets,
    allAssets,
  };
}

// One profile per issuer with a live feed, most followed first.
export function featuredProfiles(): DemoCompany[] {
  const live = RWA_ASSETS.filter(a => isFeedLive(a) && !isQaFixture(a));
  const names = [...new Set(live.map(issuerNameOf))];
  return names
    .map(name => buildProfile(name, live.filter(a => issuerNameOf(a) === name), profileAssets(name)))
    .sort((x, y) => y.followers - x.followers);
}

export const fmtCount = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n));

export function profileByName(name: string): DemoCompany | null {
  const all = profileAssets(name);
  return all.length ? buildProfile(name, all.filter(isFeedLive), all) : null;
}

/** Every issuer name in the catalog. */
const issuerNames = (): string[] => [...new Set(RWA_ASSETS.map(issuerNameOf).filter(Boolean))];

/** The company name behind a slug (see companySlug), if any. */
export const companyNameBySlug = (slug: string): string | null => issuerNames().find(n => companySlug(n) === slug) ?? null;

export function profileBySlug(slug: string): DemoCompany | null {
  const name = companyNameBySlug(slug);
  return name ? profileByName(name) : null;
}

// ─── Following ────────────────────────────────────────────────────────────────
// Shared so "Seguir" stays in sync between the Feed and the company profile.
let followed: string[] = [];
export const followedCompanies = (): readonly string[] => followed;
export function toggleFollowCompany(name: string): void {
  followed = followed.includes(name) ? followed.filter(x => x !== name) : [...followed, name];
  emitFeedStore();
}
export function useFollowing(): [readonly string[], (name: string) => void] {
  useVersion();
  return [followed, toggleFollowCompany];
}

// People I follow (by name) — separate from companies so names never clash.
let followedPeopleList: string[] = [];
export const followedPeople = (): readonly string[] => followedPeopleList;
export function toggleFollowPerson(name: string): void {
  followedPeopleList = followedPeopleList.includes(name) ? followedPeopleList.filter(x => x !== name) : [...followedPeopleList, name];
  emitFeedStore();
}
export function useFollowingPeople(): [readonly string[], (name: string) => void] {
  useVersion();
  return [followedPeopleList, toggleFollowPerson];
}

// The company a person owns, if any (owners are users too).
export function ownerCompanyOf(personName: string): string | null {
  return issuerNames().find(n => PROFILE_OWNER[n] === personName) || null;
}

export type AssetPost<A extends RwaAsset = RwaAsset> = { post: ProjectPost; asset: A };

/** Every post (milestones and regular updates) from the given projects, newest first. */
export const assetsPosts = <A extends RwaAsset>(assets: readonly A[]): Array<AssetPost<A>> => assets
  .flatMap(a => postsOf(a).map(post => ({ post, asset: a })))
  .sort((x, y) => (y.post.ts ?? 0) - (x.post.ts ?? 0));

export function useAssetsPosts<A extends RwaAsset>(assets: readonly A[]): Array<AssetPost<A>> {
  useVersion();
  return assetsPosts(assets);
}

/** Milestone posts from every live project, newest first. */
export const globalMilestones = (): AssetPost[] => RWA_ASSETS.filter(isFeedLive)
  .flatMap(a => postsOf(a).filter(p => p.milestone).map(post => ({ post, asset: a })))
  .sort((x, y) => (y.post.ts ?? 0) - (x.post.ts ?? 0));

export function useGlobalMilestones(): AssetPost[] {
  useVersion();
  return globalMilestones();
}

// ─── Project identifier ───────────────────────────────────────────────────────
// Short code shown next to a project wherever it's referenced from a company
// (posts, reviews, analytics), e.g. "EDF-021".
const CAT_PREFIX: Record<string, string> = { Autos: 'AUT', Campos: 'CAM', Drones: 'DRN', Inmuebles: 'INM', Edificios: 'EDF', QA: 'QA' };
export const projectCode = (a: Pick<RwaAsset, 'cat' | 'id'>): string => `${CAT_PREFIX[a.cat] || 'PRY'}-${String(a.id).padStart(3, '0')}`;
