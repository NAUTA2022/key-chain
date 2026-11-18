import { hashOf } from '~/lib/people';
import type { Review, SocialAsset } from '~/lib/social/types';

// Company numbers shown on its profile (summary, analytics, returns & trust,
// reviews), all derived from its projects — demo data until there's a backend.

type MetricAsset = Pick<SocialAsset, 'id' | 'valuation' | 'sold' | 'totalTokens' | 'stage' | 'apy' | 'country' | 'cat'>;

// ─── Shared metrics ───────────────────────────────────────────────────────────
export const raisedOf = (a: Pick<MetricAsset, 'valuation' | 'sold'>): number => Math.round(a.valuation * a.sold / 100);
export const investorsOf = (a: Pick<MetricAsset, 'totalTokens' | 'sold'>): number => Math.round((a.totalTokens * a.sold) / 100 / 24);
const isOperating = (a: MetricAsset) => a.stage === 'Operativo';
const monthsActive = (a: MetricAsset) => 6 + (a.id % 14);
const MONTHS = ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];

export const fmtShort = (n: number): string => (n >= 1e6 ? `$${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);

export type MetricsCompany<A extends MetricAsset = SocialAsset> = { name: string; verified: boolean; allAssets: readonly A[] };
export type MetricsPost = { post: { milestone: boolean; likes: number; commentCount: number } };

export type CompanyMetrics<A extends MetricAsset = SocialAsset> = {
  assets: readonly A[];
  raised: number;
  investors: number;
  operating: A[];
  apy: number;
  distributed: number;
  monthly: Array<{ label: string; value: number }>;
  payments: number;
  late: number;
  onTime: number;
  funded: number;
  rating: number;
  milestones: number;
  likes: number;
  comments: number;
  transparency: number;
  verifiedScore: number;
  trust: number;
  founded: number;
  countries: string[];
  cats: string[];
};

export function companyMetrics<A extends MetricAsset>(
  profile: MetricsCompany<A>,
  posts: readonly MetricsPost[] = [],
  reviews: ReadonlyArray<Pick<Review, 'rating'>> = [],
): CompanyMetrics<A> {
  const assets = profile.allAssets;
  const raised = assets.reduce((s, a) => s + raisedOf(a), 0);
  const investors = assets.reduce((s, a) => s + investorsOf(a), 0);
  const operating = assets.filter(isOperating);
  const apy = raised ? assets.reduce((s, a) => s + a.apy * raisedOf(a), 0) / raised : 0;
  const distributed = operating.reduce((s, a) => s + raisedOf(a) * a.apy / 100 * monthsActive(a) / 12, 0);
  // Distributions paid per month over the last 12 months.
  const monthly = MONTHS.map((m, i) => ({
    label: m,
    value: Math.round(operating.reduce((s, a) => s + (12 - i <= monthsActive(a) ? raisedOf(a) * a.apy / 100 / 12 : 0), 0)),
  }));
  const h = hashOf(profile.name);
  const payments = operating.reduce((s, a) => s + monthsActive(a), 0);
  const late = payments ? Math.min(payments, h % 3) : 0;
  const funded = assets.length ? assets.reduce((s, a) => s + a.sold, 0) / assets.length : 0;
  const rating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const milestones = posts.filter(p => p.post.milestone).length;
  const likes = posts.reduce((s, p) => s + p.post.likes, 0);
  const comments = posts.reduce((s, p) => s + (p.post.commentCount || 0), 0);
  const verifiedScore = profile.verified ? 100 : 40;
  const onTime = payments ? ((payments - late) / payments) * 100 : 100;
  const transparency = Math.min(100, assets.length ? (posts.length / assets.length) * 20 : 0);
  const trust = Math.round(verifiedScore * 0.25 + onTime * 0.3 + funded * 0.15 + (rating / 5) * 100 * 0.15 + transparency * 0.15);
  return {
    assets, raised, investors, operating, apy, distributed, monthly, payments, late, onTime, funded,
    rating, milestones, likes, comments, transparency, verifiedScore, trust, founded: 2018 + (h % 6),
    countries: [...new Set(assets.map(a => a.country))], cats: [...new Set(assets.map(a => a.cat))],
  };
}

export const trustLabel = (t: number): string => (t >= 85 ? 'Excelente' : t >= 70 ? 'Muy buena' : t >= 55 ? 'Buena' : 'En observación');


// ─── Reviews ──────────────────────────────────────────────────────────────────
const REVIEWERS = ['Martín Quiroga', 'Ana Pereyra', 'Lucas Giménez', 'Sofía Brandán', 'Diego Funes', 'Carla Mestre', 'Julián Paz', 'Romina Díaz', 'Pablo Ortiz', 'Valeria Sosa'];
const REVIEW_TEXT: Record<3 | 4 | 5, readonly string[]> = {
  5: ['Las rentas llegan puntuales todos los meses y los reportes son muy claros.', 'Excelente comunicación del equipo, publican cada avance con fotos.', 'Mi mejor inversión en la plataforma, superó el APY proyectado.'],
  4: ['Muy buen proyecto. Un pago se demoró unos días pero avisaron con tiempo.', 'Buena rentabilidad, me gustaría que publiquen reportes más seguido.', 'Todo según lo prometido, el soporte responde rápido.'],
  3: ['Cumple, aunque la recaudación fue más lenta de lo esperado.', 'Rentabilidad correcta, la comunicación podría mejorar.'],
};
const REVIEW_DATES = ['12 Jun 2026', '28 May 2026', '15 May 2026', '02 May 2026', '19 Abr 2026', '03 Abr 2026'];
const RATINGS = [5, 5, 4, 5, 4, 3] as const;

export function seedReviews(profile: { allAssets: readonly SocialAsset[] } | null): Review[] {
  if (!profile) return [];
  return profile.allAssets.flatMap(a => {
    const n = 1 + (a.id % 3);
    return Array.from({ length: n }, (_, i): Review => {
      const h = hashOf(`${a.id}-${i}`);
      const rating = RATINGS[h % RATINGS.length];
      const pool = REVIEW_TEXT[rating];
      return {
        id: `${a.id}-r${i}`, asset: a, rating, author: REVIEWERS[h % REVIEWERS.length],
        text: pool[h % pool.length], date: REVIEW_DATES[(h >>> 3) % REVIEW_DATES.length], ts: -((h >>> 3) % REVIEW_DATES.length),
      };
    });
  }).sort((x, y) => y.ts - x.ts);
}
