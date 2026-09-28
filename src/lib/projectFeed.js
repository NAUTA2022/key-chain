import { useSyncExternalStore } from 'react';
import { RWA_ASSETS } from '../data';

// Project feeds, shared across the app: each project's Feed tab reads and
// writes its own posts here, and the global Feed (pages/GlobalFeed) shows the
// milestone ("hito") posts of every live project. Kept in memory — posts,
// likes, comments and uploads reset on reload until there's a backend.

// A project has a feed once it's running, fully funded, or was explicitly
// flagged early (feedEnabled) — some projects start building/buying the
// underlying asset before their raise closes and want to post progress
// during that window too.
export const isFeedLive = (a) => a.stage === 'Operativo' || a.sold >= 100 || a.feedEnabled === true;

// Posts carry `media`; older ones may still use a single `img` field.
export const postMedia = (post) => post.media || (post.img ? [{ id: post.img, type: 'image', url: post.img }] : []);

export const issuerNameOf = (a) => (a.issuer === 'keychain' ? 'KEYCHAIN' : (a.company || ''));

// ─── Seed posts ───────────────────────────────────────────────────────────────
// Deterministic per asset so every project reads a little differently and the
// global feed interleaves them by date instead of stacking identical posts.
const TODAY = Date.UTC(2026, 5, 13);
const DAY = 86400000;
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const fmtPostDate = (ts) => {
  const d = new Date(ts);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

// Short pan/zoom clips over each category's own photos (public/videos).
const CAT_VIDEO = {
  Autos: '/videos/autos.webm', Campos: '/videos/campos.webm', Drones: '/videos/drones.webm',
  Inmuebles: '/videos/inmuebles.webm', Edificios: '/videos/edificios.webm',
};

const CAT_UPDATE = {
  Autos:     ['Mantenimiento programado completado en toda la flota. Todas las unidades vuelven a operar esta semana.', 'Así quedó la flota después del service anual 🚗'],
  Campos:    ['Avanza la cosecha: ya levantamos el 60% del lote con rindes por encima del promedio de la zona.', 'Recorrido por el campo esta mañana 🌾'],
  Drones:    ['Sumamos 3 nuevos contratos de servicio. Los equipos ya están volando en las zonas asignadas.', 'Vuelo de prueba de los equipos nuevos 🛸'],
  Inmuebles: ['Terminamos la renovación de las unidades: pisos, cocina y climatización nuevos.', 'Así quedaron las unidades renovadas 🏠'],
  Edificios: ['Se renovaron los contratos de los inquilinos principales por 3 años más. Ocupación actual: 94%.', 'Recorrido por las oficinas renovadas 🏢'],
};
const DEFAULT_UPDATE = ['Avanzamos con el plan operativo según lo previsto para este trimestre.', 'Avances del proyecto'];

// Category milestones, posted with a photo or the category video.
const CAT_HITOS = {
  Autos:     ['¡Toda la flota ya está operando en plataforma! Primer mes completo con 100% de las unidades activas.', 'Superamos los 50.000 viajes realizados desde el lanzamiento 🎉', 'Renovamos el seguro full cobertura de toda la flota por 12 meses.'],
  Campos:    ['¡Terminamos la siembra de la campaña 2026! Todo el lote quedó implantado en fecha.', 'Cosecha finalizada con un rinde 12% por encima de lo proyectado 🌾', 'Firmamos el contrato de venta anticipada de la producción con la exportadora.'],
  Drones:    ['Superamos las 10.000 hectáreas relevadas con la flota 🛸', 'Obtuvimos la habilitación de ANAC para operar en zona ampliada.', 'Incorporamos 5 drones nuevos a la flota, financiados con la última ronda.'],
  Inmuebles: ['¡Ocupación completa! Todas las unidades están alquiladas este mes 🏠', 'Finalizó la renovación integral y ya recibimos a los primeros inquilinos.', 'La tasación independiente valuó el inmueble un 8% por encima de la compra.'],
  Edificios: ['Firmamos contrato con un nuevo inquilino corporativo por 5 años 🏢', 'El edificio obtuvo la certificación de eficiencia energética LEED.', 'Ocupación del 96%: el nivel más alto desde la tokenización.'],
};
const DEFAULT_HITOS = ['Auditoría operativa del trimestre sin observaciones. El informe completo está en Documentos.', 'Publicamos el reporte trimestral con todos los indicadores del proyecto.', 'Completamos la verificación legal y registral del activo.'];
const DIST_TEXT = [
  (m, h) => `Se distribuyeron $${m} USDC entre ${h} holders. Gracias por confiar en el proyecto.`,
  (m, h) => `💸 Distribución mensual enviada: $${m} USDC repartidos entre ${h} holders.`,
  (m, h) => `Ya está en sus wallets la renta del mes: $${m} USDC para ${h} holders.`,
];

const COMMENTERS = ['Lucía M.', 'Martín G.', 'Sofía R.', 'Diego P.', 'Carla V.', 'Tomás L.'];
const COMMENTS = ['¡Llegó puntual como siempre! 👏', 'Excelente noticia, gracias por la transparencia.', '¿Cuándo es la próxima distribución?', 'Muy buen avance 🙌', 'Se ve impecable.'];

const photo = (src, n) => ({ id: `${src}#${n}`, type: 'image', url: src });

function seedPosts(a) {
  const imgs = a.images?.length ? a.images : [a.img];
  const pic = (i) => photo(imgs[i % imgs.length], i);
  const video = CAT_VIDEO[a.cat];
  const [updateText, videoText] = CAT_UPDATE[a.cat] || DEFAULT_UPDATE;
  const monthly = Math.round((a.valuation * a.apy) / 100 / 12);
  const holders = Math.max(12, Math.round((a.totalTokens * a.sold) / 100 / 24));
  // Each post type gets its own per-project offset so the global feed mixes
  // distributions, videos and funding milestones instead of stacking one kind.
  const at = (days, mult) => TODAY - (days + ((a.id * mult) % 17)) * DAY;
  const withVideo = video && a.id % 2 === 0;
  const pick = (k) => COMMENTERS[(a.id + k) % COMMENTERS.length];
  const hitos = CAT_HITOS[a.cat] || DEFAULT_HITOS;
  const hito = hitos[a.id % hitos.length];

  const posts = [
    { id: `${a.id}-1`, ts: at(2, 7), milestone: true,
      text: DIST_TEXT[a.id % DIST_TEXT.length](monthly.toLocaleString('en-US'), holders),
      media: [pic(0)], likes: 18 + (a.id % 23),
      comments: [{ id: `${a.id}-1c`, date: fmtPostDate(at(2, 7)), author: pick(0), text: COMMENTS[a.id % COMMENTS.length], isIssuer: false }] },
    { id: `${a.id}-2`, ts: at(6, 5), milestone: false, text: updateText,
      media: [pic(1), pic(2)], likes: 6 + (a.id % 9) },
    { id: `${a.id}-3`, ts: at(0, 3), milestone: true,
      text: withVideo ? `${hito} ${videoText}` : hito,
      media: withVideo ? [{ id: `${a.id}-v`, type: 'video', url: video }] : [pic(2)], likes: 12 + (a.id % 17) },
    { id: `${a.id}-4`, ts: at(4, 11), milestone: true,
      text: a.sold >= 100 ? '¡Ronda cerrada! El proyecto se financió al 100%.' : `El proyecto alcanzó el ${a.sold}% de financiación.`,
      media: [pic(3)], likes: 20 + (a.id % 13) },
    { id: `${a.id}-5`, ts: at(30, 2), milestone: false, text: 'Se firmó contrato de operación por 24 meses adicionales.',
      media: [], likes: 4 + (a.id % 7) },
  ];
  return posts.map(p => ({ ...p, date: fmtPostDate(p.ts), liked: false, comments: p.comments || [] }));
}

// ─── Store ────────────────────────────────────────────────────────────────────
const byAsset = new Map();
const listeners = new Set();
let version = 0;

const postsOf = (a) => {
  if (!byAsset.has(a.id)) byAsset.set(a.id, seedPosts(a));
  return byAsset.get(a.id);
};

function emit() {
  version += 1;
  listeners.forEach(fn => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const useVersion = () => useSyncExternalStore(subscribe, () => version, () => version);

export function setProjectPosts(a, updater) {
  byAsset.set(a.id, typeof updater === 'function' ? updater(postsOf(a)) : updater);
  emit();
}

// [posts, setPosts] for one project — same shape as useState.
export function useProjectPosts(a) {
  useVersion();
  return [postsOf(a), (updater) => setProjectPosts(a, updater)];
}

// ─── Featured profiles ────────────────────────────────────────────────────────
// One profile per issuer with a live feed (the author shown on its posts).
const PROFILE_BIO = {
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

export function featuredProfiles() {
  const byName = new Map();
  RWA_ASSETS.filter(a => isFeedLive(a) && a.cat !== 'QA').forEach(a => {
    const name = issuerNameOf(a);
    const p = byName.get(name) || { name, assets: [], investors: 0 };
    p.assets.push(a);
    p.investors += Math.round((a.totalTokens * a.sold) / 100 / 24);
    byName.set(name, p);
  });
  return [...byName.values()]
    .map(p => ({
      name: p.name,
      handle: p.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      cover: (p.assets[0].images || [p.assets[0].img])[0],
      bio: PROFILE_BIO[p.name] || `Emisor de ${p.assets.length} proyectos tokenizados en KEYCHAIN.`,
      verified: p.name === 'KEYCHAIN' || p.assets.some(a => a.issuer === 'verified' || a.issuer === 'keychain'),
      projects: p.assets.length,
      followers: p.investors * 7,
    }))
    .sort((x, y) => y.followers - x.followers);
}

// Milestone posts from every live project, newest first.
export function useGlobalMilestones() {
  useVersion();
  return RWA_ASSETS.filter(isFeedLive)
    .flatMap(a => postsOf(a).filter(p => p.milestone).map(post => ({ post, asset: a })))
    .sort((x, y) => (y.post.ts ?? 0) - (x.post.ts ?? 0));
}
