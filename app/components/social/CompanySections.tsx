import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { PCard, PBtn } from '~/components/ui';
import { ProjectCode } from '~/components/social/FeedPostCard';
import ProjectBrowser from '~/components/social/ProjectBrowser';
import { VerifiedBadge } from '~/components/social/ProfileCard';
import { UserAvatar, type AvatarUser } from '~/components/social/IdentityAvatar';
import { fmtUSD } from '~/data';
import { fmtCount } from '~/lib/projectFeed';
import { hashOf } from '~/lib/people';
import { companyMetrics, fmtShort, raisedOf, investorsOf, type CompanyMetrics } from '~/lib/companyStats';
import { localMonthLabel } from '~/lib/social/identity';
import { useT, type Translator } from '~/i18n/useT';
import type { NavFn } from '~/lib/navigation';
import type { CompanyLive, CompanyProfile, FeedItem, Review, ReviewInput, SocialAsset } from '~/lib/social/types';

// The sections of a company profile besides its projects and milestones:
// Resumen, Analítica, Rentabilidad y confianza and Reseñas. In demo mode every
// number is derived from the company's projects (the design's formulas); in
// live mode they come from the API (`profile.live`) and what the API doesn't
// measure (trust index, on-time payments) shows an empty state instead.

export type CompanySectionTab = 'resumen' | 'proyectos' | 'hitos' | 'analitica' | 'confianza' | 'resenas';

type SectionProps = {
  profile: CompanyProfile;
  /** Every post of the company (milestones and regular updates), newest first. */
  posts: readonly FeedItem[];
  reviews: readonly Review[];
  nav: NavFn;
  isMobile: boolean;
};

/** What the sections show: the demo metrics, with the values the API can't provide as null. */
type ViewMetrics = Omit<CompanyMetrics, 'apy' | 'payments' | 'late' | 'onTime' | 'transparency' | 'verifiedScore' | 'trust' | 'founded'> & {
  apy: number | null;
  payments: number | null;
  late: number | null;
  onTime: number | null;
  transparency: number | null;
  verifiedScore: number | null;
  trust: number | null;
  /** [label key, value]: "Fundada" (demo) or the month it joined Brikme (live, a "Mar 2025" label). */
  since: readonly [string, string];
  raisedBy: (a: SocialAsset) => number;
  investorsBy: (a: SocialAsset) => number;
  /** The owner passed KYC (null: unknown). */
  ownerKyc: boolean | null;
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const monthYear = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

function liveMetrics(profile: CompanyProfile, live: CompanyLive, reviews: readonly Review[]): ViewMetrics {
  const s = live.stats;
  const assets = profile.allAssets;
  const perAsset = new Map(live.projectStats.map(p => [p.assetId, p]));
  return {
    assets,
    raised: s.raised,
    investors: s.investors,
    operating: assets.filter(a => a.stage === 'Operativo'),
    apy: s.avgApy,
    distributed: s.distributed,
    monthly: live.monthly,
    payments: null,
    late: null,
    onTime: null,
    funded: assets.length ? assets.reduce((t, a) => t + a.sold, 0) / assets.length : 0,
    rating: reviews.length ? reviews.reduce((t, r) => t + r.rating, 0) / reviews.length : (s.reviews.average ?? 0),
    milestones: s.milestones,
    likes: s.likes,
    comments: s.comments,
    transparency: null,
    verifiedScore: null,
    trust: null,
    countries: s.countries,
    cats: s.categories,
    since: ['social.company.sinceLive', monthYear(live.createdAt)],
    raisedBy: a => perAsset.get(a.id)?.raised ?? 0,
    investorsBy: a => perAsset.get(a.id)?.investors ?? 0,
    ownerKyc: null,
  };
}

function metricsOf({ profile, posts, reviews }: SectionProps): ViewMetrics {
  if (profile.live) return liveMetrics(profile, profile.live, reviews);
  const m = companyMetrics(profile, posts, reviews);
  return { ...m, since: ['social.company.sinceFounded', String(m.founded)], raisedBy: raisedOf, investorsBy: investorsOf, ownerKyc: true };
}

const pct = (v: number | null, digits = 0) => (v === null ? '—' : `${v.toFixed(digits)}%`);
/** Trust index in words (same thresholds as lib/companyStats' trustLabel). */
const trustText = (t: Translator['t'], v: number | null) =>
  t(v === null ? 'social.company.trustUnrated' : v >= 85 ? 'social.company.trustExcellent' : v >= 70 ? 'social.company.trustVeryGood' : v >= 55 ? 'social.company.trustGood' : 'social.company.trustWatch');

/** Data values (Spanish categories / countries) in the active language; unknown values as they come. */
function useValueLabels() {
  const { raw } = useT('common');
  return (group: 'categories' | 'countries', v: string) => raw<string | undefined>(`${group}.${v}`) ?? v;
}

// ─── Small building blocks ────────────────────────────────────────────────────
const H = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 14 }}>
    <h3 style={{ margin: 0, fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{children}</h3>
    {sub && <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 3 }}>{sub}</div>}
  </div>
);

type Kpi = readonly [value: string, label: string, hint?: string];

function Kpis({ items, isMobile }: { items: readonly Kpi[]; isMobile: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : `repeat(${items.length}, minmax(0,1fr))`, gap: 12, marginBottom: 18 }}>
      {items.map(([v, l, hint]) => (
        <PCard key={l} style={{ padding: '14px 18px' }}>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{l}</div>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.03em' }}>{v}</div>
          {hint && <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 3 }}>{hint}</div>}
        </PCard>
      ))}
    </div>
  );
}

export function Stars({ value, size = 14, onPick }: { value: number; size?: number; onPick?: (n: number) => void }) {
  const { t } = useT('profile');
  return (
    <span style={{ display: 'inline-flex', gap: 1 }} role="img" aria-label={t('social.company.starsAria', { value })}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} onClick={onPick ? () => onPick(n) : undefined}
          style={{ fontSize: size, lineHeight: 1, color: n <= Math.round(value) ? '#F5A623' : 'var(--border)', cursor: onPick ? 'pointer' : 'default' }}>★</span>
      ))}
    </span>
  );
}

type TipState = { x: number; y: number; lines: ReactNode[] } | null;

// Hover tooltip shared by the charts.
function Tip({ tip }: { tip: TipState }) {
  if (!tip) return null;
  return (
    <div style={{
      position: 'absolute', left: tip.x, top: tip.y, transform: 'translate(-50%, calc(-100% - 8px))', pointerEvents: 'none', zIndex: 3,
      background: 'var(--text)', color: 'var(--bg)', borderRadius: 8, padding: '6px 10px', whiteSpace: 'nowrap',
      fontFamily: 'var(--font-b)', fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
    }}>
      {tip.lines.map((l, i) => <div key={i} style={{ fontWeight: i === 0 ? 700 : 400 }}>{l}</div>)}
    </div>
  );
}

/** Pointer position relative to an ancestor box (for the chart tooltips). */
const pointIn = (e: ReactMouseEvent<HTMLElement>, box: HTMLElement | null | undefined) => {
  const r = (box ?? e.currentTarget).getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

type BarRow = { key: number; value: number; asset: SocialAsset; label: ReactNode };

// Horizontal bars, one series (magnitude → one hue), value labelled at the end.
function HBarChart({ rows, fmt, tipFor }: { rows: readonly BarRow[]; fmt: (v: number) => string; tipFor: (r: BarRow) => ReactNode[] }) {
  const [tip, setTip] = useState<TipState>(null);
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <div style={{ position: 'relative' }} onMouseLeave={() => setTip(null)}>
      {rows.map(r => (
        <div key={r.key}
          onMouseMove={e => setTip({ ...pointIn(e, e.currentTarget.parentElement), lines: tipFor(r) })}
          style={{ display: 'grid', gridTemplateColumns: '72px 1fr 64px', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'default' }}>
          <span>{r.label}</span>
          <div style={{ height: 14, background: 'var(--surface2)', borderRadius: 4 }}>
            <div style={{ height: '100%', width: `${Math.max(2, (r.value / max) * 100)}%`, background: 'var(--accent)', borderRadius: 4 }} />
          </div>
          <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{fmt(r.value)}</span>
        </div>
      ))}
      <Tip tip={tip} />
    </div>
  );
}

// Vertical columns over time, one series, recessive baseline + 2 gridlines.
function ColumnChart({ points, fmt, height = 160 }: { points: ReadonlyArray<{ label: string; value: number }>; fmt: (v: number) => string; height?: number }) {
  const { raw } = useT('profile');
  const months = raw<string[]>('social.months');
  const [tip, setTip] = useState<TipState>(null);
  const max = Math.max(1, ...points.map(p => p.value)) * 1.15;
  return (
    <div style={{ position: 'relative', paddingTop: 18 }} onMouseLeave={() => setTip(null)}>
      <div style={{ position: 'relative', height, display: 'flex', alignItems: 'flex-end', gap: 6, borderBottom: '1px solid var(--border)' }}>
        {[0.5, 1].map(f => (
          <div key={f} style={{ position: 'absolute', left: 0, right: 0, bottom: `${f * 100}%`, borderTop: '1px dashed var(--border-l)', zIndex: 0 }}>
            <span style={{ position: 'absolute', left: 0, top: -16, fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)' }}>{fmt(max * f)}</span>
          </div>
        ))}
        {points.map((p, i) => (
          <div key={p.label + i} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default', position: 'relative', zIndex: 1 }}
            onMouseMove={e => setTip({ ...pointIn(e, e.currentTarget.parentElement?.parentElement), lines: [localMonthLabel(p.label, months), fmtUSD(p.value)] })}>
            <div style={{ width: '100%', height: `${(p.value / max) * 100}%`, minHeight: p.value ? 2 : 0, background: 'var(--accent)', borderRadius: '4px 4px 0 0' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {points.map((p, i) => <span key={p.label + i} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)' }}>{localMonthLabel(p.label, months)}</span>)}
      </div>
      <Tip tip={tip} />
    </div>
  );
}

function Sparkline({ values, width = 90, height = 26 }: { values: readonly number[]; width?: number; height?: number }) {
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - min) / (max - min || 1)) * (height - 4)}`).join(' ');
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Resumen ──────────────────────────────────────────────────────────────────
type SummaryProps = SectionProps & {
  /** Null when nobody manages the company yet (live). */
  owner: AvatarUser | null;
  onOwner: () => void;
  onTab: (tab: CompanySectionTab) => void;
};

export function CompanySummary(props: SummaryProps) {
  const { profile, posts, reviews, owner, nav, isMobile, onOwner, onTab } = props;
  const { t, raw } = useT('profile');
  const valueLabel = useValueLabels();
  const months = raw<string[]>('social.months');
  const m = metricsOf(props);
  const latest = posts.filter(p => p.post.milestone).slice(0, 3);
  return (
    <div>
      <Kpis isMobile={isMobile} items={[
        [fmtShort(m.raised), t('social.company.raised')],
        [fmtCount(m.investors), t('social.company.investors')],
        [`${m.assets.length}`, t('social.company.projects'), t('social.company.projectsHint', { operating: m.operating.length, raising: m.assets.length - m.operating.length })],
        [pct(m.apy, 1), t('social.company.avgApy')],
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1.6fr) minmax(0,1fr)', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <PCard style={{ padding: '20px 22px' }}>
            <H>{t('social.company.about', { name: profile.name })}</H>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: profile.bio ? 'var(--sec)' : 'var(--ter)', lineHeight: 1.6, marginBottom: 16 }}>{profile.bio || t('social.company.noBio')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {[
                [t(m.since[0]), localMonthLabel(m.since[1], months)],
                [t('social.company.countries'), m.countries.map(c => valueLabel('countries', c)).join(', ') || '—'],
                [t('social.company.categories'), m.cats.map(c => valueLabel('categories', c)).join(', ') || '—'],
                [t('social.company.verification'), profile.verified ? t('social.company.verifiedKyb') : t('social.company.unverified')],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', fontWeight: 600, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
          </PCard>

          <PCard style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <H>{t('social.company.latestMilestones')}</H>
              <button onClick={() => onTab('hitos')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-text)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600 }}>{t('social.company.viewAll')}</button>
            </div>
            {latest.length === 0 && <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{t('social.company.noMilestones')}</div>}
            {latest.map(({ post, asset }, i) => (
              <button key={post.id} onClick={() => nav('detalle', { ...asset, focusPostId: post.id })}
                style={{ display: 'flex', gap: 12, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', color: 'inherit', borderTop: i ? '1px solid var(--border-l)' : 'none' }}>
                <img src={post.media[0]?.type === 'image' ? post.media[0].url : asset.img} alt="" loading="lazy" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <ProjectCode asset={asset} />
                    <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{asset.name} · {localMonthLabel(post.date, months)}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.text}</div>
                </div>
              </button>
            ))}
          </PCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <PCard style={{ padding: '20px 22px' }}>
            <H>{t('social.company.owner')}</H>
            {owner ? (
              <button onClick={onOwner} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit' }}>
                {owner.avatarUrl || owner.anonymous
                  ? <UserAvatar size={44} user={owner} />
                  : <div style={{ width: 44, height: 44, borderRadius: '50%', background: owner.gradient, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{owner.initial}</div>}
                <div>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{owner.name}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>{profile.live ? t('social.company.ownerLive') : t('social.company.ownerDemo')}</div>
                </div>
              </button>
            ) : (
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{t('social.company.noOwner')}</div>
            )}
          </PCard>

          <PCard style={{ padding: '20px 22px' }}>
            <H>{t('social.company.trust')}</H>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <TrustRing value={m.trust} size={72} />
              <div>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{trustText(t, m.trust)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Stars value={m.rating} /> <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)' }}>{t(reviews.length === 1 ? 'social.company.ratingReviewsOne' : 'social.company.ratingReviewsOther', { rating: m.rating.toFixed(1), count: reviews.length })}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 4 }}>{m.onTime === null ? t('social.company.onTimeNoData') : t('social.company.onTimePct', { pct: m.onTime.toFixed(0) })}</div>
              </div>
            </div>
            <PBtn variant="secondary" small style={{ marginTop: 14 }} onClick={() => onTab('confianza')}>{t('social.company.viewTrust')}</PBtn>
          </PCard>

        </div>
      </div>

      {/* Projects — mini marketplace with search and filters (first 6) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '24px 0 12px' }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{t('social.company.projects')} <span style={{ color: 'var(--ter)', fontWeight: 600 }}>({m.assets.length})</span></h3>
      </div>
      <ProjectBrowser items={m.assets.map(asset => ({ asset }))} nav={nav} isMobile={isMobile} showCode minCard={300} limit={6} onMore={() => onTab('proyectos')} placeholder={t('social.company.searchProjects')} />
    </div>
  );
}

// `value` null: not enough data yet (live) — empty ring with a dash.
function TrustRing({ value, size = 72 }: { value: number | null; size?: number }) {
  const { t } = useT('profile');
  const r = (size - 8) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} role="img" aria-label={value === null ? t('social.company.trustIndexNoDataAria') : t('social.company.trustIndexAria', { value })}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface2)" strokeWidth="6" />
        {value !== null && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: size * 0.3, color: 'var(--text)', lineHeight: 1 }}>{value ?? '—'}</span>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 9.5, color: 'var(--ter)' }}>/100</span>
      </div>
    </div>
  );
}

// ─── Analítica ────────────────────────────────────────────────────────────────
export function CompanyAnalytics(props: SectionProps) {
  const { isMobile } = props;
  const { t } = useT('profile');
  const m = metricsOf(props);
  const rows: BarRow[] = [...m.assets].sort((x, y) => m.raisedBy(y) - m.raisedBy(x)).map(a => ({
    key: a.id, value: m.raisedBy(a), asset: a, label: <ProjectCode asset={a} />,
  }));
  const investorRows: BarRow[] = [...m.assets].sort((x, y) => m.investorsBy(y) - m.investorsBy(x)).map(a => ({
    key: a.id, value: m.investorsBy(a), asset: a, label: <ProjectCode asset={a} />,
  }));
  return (
    <div>
      <Kpis isMobile={isMobile} items={[
        [fmtShort(m.raised), t('social.company.raised'), t('social.company.fundedAvg', { pct: m.funded.toFixed(0) })],
        [fmtShort(m.distributed), t('social.company.distributedToInvestors')],
        [fmtCount(m.investors), t('social.company.investors')],
        [`${m.milestones}`, t('social.company.milestonesPublished'), t('social.company.engagement', { likes: fmtCount(m.likes), comments: m.comments })],
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 18 }}>
        <PCard style={{ padding: '20px 22px' }}>
          <H sub={t('social.company.capitalByProjectSub')}>{t('social.company.capitalByProject')}</H>
          <HBarChart rows={rows} fmt={fmtShort}
            tipFor={r => [r.asset.name, t('social.company.tipFunded', { amount: fmtUSD(r.value), pct: r.asset.sold })]} />
        </PCard>
        <PCard style={{ padding: '20px 22px' }}>
          <H sub={t('social.company.investorsByProjectSub')}>{t('social.company.investorsByProject')}</H>
          <HBarChart rows={investorRows} fmt={v => fmtCount(v)}
            tipFor={r => [r.asset.name, t('social.company.tipInvestors', { count: fmtCount(r.value) })]} />
        </PCard>
        <PCard style={{ padding: '20px 22px', gridColumn: isMobile ? 'auto' : '1 / -1' }}>
          <H sub={t('social.company.distributionsSub')}>{t('social.company.distributions')}</H>
          <ColumnChart points={m.monthly} fmt={fmtShort} />
        </PCard>
      </div>
    </div>
  );
}

// ─── Rentabilidad y confianza ─────────────────────────────────────────────────
export function CompanyTrust(props: SectionProps) {
  const { profile, posts, reviews, nav, isMobile } = props;
  const { t } = useT('profile');
  const { t: tc } = useT('common');
  const m = metricsOf(props);
  const round = (v: number | null) => (v === null ? null : Math.round(v));
  const posted = profile.live ? profile.live.stats.posts : posts.length;
  const factors: ReadonlyArray<readonly [string, number | null, string]> = [
    [t('social.company.factorVerification'), m.verifiedScore, profile.verified ? t('social.company.kybApproved') : t('social.company.pendingVerification')],
    [t('social.company.onTime'), round(m.onTime), m.payments && m.late !== null ? t('social.company.onTimeHint', { ok: m.payments - m.late, total: m.payments }) : t('social.company.noDistributions')],
    [t('social.company.factorFunding'), Math.round(m.funded), t('social.company.factorFundingHint')],
    [t('social.company.factorReviews'), Math.round((m.rating / 5) * 100), t(reviews.length === 1 ? 'social.company.factorReviewsHintOne' : 'social.company.factorReviewsHintOther', { rating: m.rating.toFixed(1), count: reviews.length })],
    [t('social.company.factorTransparency'), round(m.transparency), t(posted === 1 ? 'social.company.factorTransparencyHintOne' : 'social.company.factorTransparencyHintOther', { count: posted })],
  ];
  const signals: ReadonlyArray<readonly [boolean | null, string]> = [
    [profile.verified, t('social.company.verifiedKyb')],
    [m.ownerKyc, t('social.company.signalOwnerKyc')],
    [m.assets.every(a => a.contract), t('social.company.signalContracts')],
    [m.late === null ? null : m.late === 0, t('social.company.signalNoLate')],
    [m.milestones > 0, t('social.company.signalMilestones')],
  ];
  return (
    <div>
      <Kpis isMobile={isMobile} items={[
        [pct(m.apy, 1), t('social.company.avgApy'), t('social.company.avgApyHint')],
        [fmtShort(m.distributed), t('social.company.rentsDistributed')],
        m.onTime === null ? ['—', t('social.company.onTime'), t('social.company.noDataYet')] : [pct(m.onTime), t('social.company.onTime')],
        [m.trust === null ? '—' : `${m.trust}/100`, t('social.company.trustIndex'), trustText(t, m.trust)],
      ]} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)', gap: 18, marginBottom: 18 }}>
        <PCard style={{ padding: '20px 22px' }}>
          <H sub={t('social.company.trustIndexSub')}>{t('social.company.trustIndex')}</H>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <TrustRing value={m.trust} size={84} />
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--text)' }}>{trustText(t, m.trust)}</b>. {m.trust === null ? t('social.company.trustNoData') : t('social.company.trustExplain')}
            </div>
          </div>
          {factors.map(([label, v, hint]) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-b)', fontSize: 12.5 }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{v ?? '—'}</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, margin: '5px 0 3px' }}>
                <div style={{ width: `${v ?? 0}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
              </div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{hint}</div>
            </div>
          ))}
        </PCard>

        <PCard style={{ padding: '20px 22px' }}>
          <H>{t('social.company.signals')}</H>
          {signals.map(([ok, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-l)' }}>
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0,
                background: ok ? 'color-mix(in oklab, var(--pos) 15%, transparent)' : 'var(--surface2)', color: ok ? 'var(--pos)' : 'var(--ter)' }}>{ok ? '✓' : '–'}</span>
              <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: ok ? 'var(--text)' : 'var(--ter)' }}>{label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-b)', fontSize: 11.5, color: ok ? 'var(--pos)' : 'var(--ter)', fontWeight: 600 }}>{ok ? t('social.company.meets') : ok === null ? t('social.company.noData') : t('social.company.notMeets')}</span>
            </div>
          ))}
          {profile.verified && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)' }}>
              <VerifiedBadge /> {t('social.company.verifiedByBrikme')}
            </div>
          )}
        </PCard>
      </div>

      <PCard style={{ padding: '20px 22px' }}>
        <H sub={t('social.company.returnsSub')}>{t('social.company.returns')}</H>
        <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-b)', fontSize: 13, minWidth: 620 }}>
            <thead>
              <tr style={{ color: 'var(--ter)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                {[t('social.company.colProject'), t('social.company.colStatus'), t('social.company.colApy'), t('social.company.colFunded'), t('social.company.colValue12m'), t('social.company.colTrend')].map(h => <th key={h} scope="col" style={{ padding: '6px 8px', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {m.assets.map(a => {
                const perf = a.perf?.length ? a.perf : [1, 1];
                const chg = perf[0] ? ((perf[perf.length - 1] - perf[0]) / perf[0]) * 100 : 0;
                return (
                  <tr key={a.id} onClick={() => nav('detalle', a)} style={{ borderTop: '1px solid var(--border-l)', cursor: 'pointer' }}>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ProjectCode asset={a} /><span style={{ color: 'var(--text)', fontWeight: 600 }}>{a.name}</span></div>
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--sec)' }}>{tc(`stages.${a.stage}`)}</td>
                    <td style={{ padding: '10px 8px', color: 'var(--text)', fontWeight: 700 }}>{a.apy}%</td>
                    <td style={{ padding: '10px 8px', color: 'var(--sec)' }}>{a.sold}%</td>
                    <td style={{ padding: '10px 8px', color: chg >= 0 ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 }}>{chg >= 0 ? '+' : ''}{chg.toFixed(1)}%</td>
                    <td style={{ padding: '10px 8px' }}><Sparkline values={perf} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PCard>
    </div>
  );
}

// ─── Reseñas ──────────────────────────────────────────────────────────────────
type ReviewsProps = Omit<SectionProps, 'posts'> & {
  /** The viewer runs this company (can't review it). */
  isMine: boolean;
  /** The signed-in user (their own reviews use their avatar); null hides the form. */
  viewer: AvatarUser | null;
  /** Resolves whether it was published (the form keeps the draft otherwise). */
  onAdd: (input: ReviewInput) => Promise<boolean>;
  /** Live: the projects the viewer invested in (the only ones they may review). Omit to offer every project (demo). */
  reviewable?: readonly SocialAsset[];
  /** Live: edit / delete the viewer's own reviews (`isMine`). */
  onEdit?: (review: Review, input: Omit<ReviewInput, 'assetId'>) => Promise<boolean>;
  onDelete?: (review: Review) => void;
  /** Last error of a review action (Spanish, from the source). */
  error?: string | null;
};

type ReviewDraft = { assetId: number | undefined; rating: number; text: string };

export function CompanyReviews({ profile, reviews, onAdd, isMine, viewer, nav, isMobile, reviewable, onEdit, onDelete, error }: ReviewsProps) {
  const { t, raw } = useT('profile');
  const months = raw<string[]>('social.months');
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [draft, setDraft] = useState<ReviewDraft>({ assetId: profile.allAssets[0]?.id, rating: 5, text: '' });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; rating: number; text: string } | null>(null);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const shown = filter === 'all' ? reviews : reviews.filter(r => r.asset.id === filter);
  const projects = profile.allAssets.filter(a => reviews.some(r => r.asset.id === a.id));
  // One review per project: the ones already reviewed by the viewer drop out of the form.
  const options = (reviewable ?? profile.allAssets).filter(a => !reviews.some(r => r.isMine && r.asset.id === a.id));
  const selectedId = options.some(a => a.id === draft.assetId) ? draft.assetId : options[0]?.id;
  const submit = () => {
    const asset = options.find(a => a.id === selectedId);
    if (!asset || !draft.text.trim() || busy) return;
    setBusy(true);
    void onAdd({ assetId: asset.id, rating: draft.rating, text: draft.text.trim() }).then(ok => {
      setBusy(false);
      if (ok) setDraft(d => ({ ...d, text: '', rating: 5 }));
    });
  };
  const saveEdit = (r: Review) => {
    if (!editing || !onEdit || !editing.text.trim() || busy) return;
    setBusy(true);
    void onEdit(r, { rating: editing.rating, text: editing.text.trim() }).then(ok => {
      setBusy(false);
      if (ok) setEditing(null);
    });
  };
  const chip = (id: number | 'all', label: string) => (
    <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id}
      style={{ padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600,
        border: `1px solid ${filter === id ? 'var(--text)' : 'var(--border-l)'}`, background: filter === id ? 'var(--surface2)' : 'transparent', color: filter === id ? 'var(--text)' : 'var(--sec)' }}>
      {label}
    </button>
  );
  const isViewer = (r: Review) => !!r.isMine || (!!viewer && r.author === viewer.name);
  const openAuthor = (r: Review) => (isViewer(r) ? nav('perfil') : nav('usuario', r.authorId ?? r.author));
  const fieldStyle = { width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-l)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13, outline: 'none' } as const;
  const smallLink = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600, color: 'var(--ter)' } as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,2fr)', gap: 18, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <PCard style={{ padding: '20px 22px' }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 40, color: 'var(--text)', lineHeight: 1 }}>{avg.toFixed(1)}</div>
          <div style={{ margin: '6px 0 4px' }}><Stars value={avg} size={18} /></div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginBottom: 14 }}>{t(reviews.length === 1 ? 'social.company.investorReviewsOne' : 'social.company.investorReviewsOther', { count: reviews.length })}</div>
          {[5, 4, 3, 2, 1].map(n => {
            const c = reviews.filter(r => r.rating === n).length;
            return (
              <div key={n} style={{ display: 'grid', gridTemplateColumns: '18px 1fr 24px', gap: 8, alignItems: 'center', marginBottom: 5, fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--sec)' }}>
                <span>{n}★</span>
                <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99 }}>
                  <div style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%`, height: '100%', background: '#F5A623', borderRadius: 99 }} />
                </div>
                <span style={{ textAlign: 'right' }}>{c}</span>
              </div>
            );
          })}
        </PCard>

        {!isMine && viewer && (
          <PCard style={{ padding: '20px 22px' }}>
            <H sub={t('social.company.writeReviewSub')}>{t('social.company.writeReview')}</H>
            {options.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', lineHeight: 1.5 }}>
                {reviewable && reviewable.length === 0
                  ? t('social.company.canReviewInvested')
                  : t('social.company.allReviewed')}
              </div>
            ) : (
              <>
                <select value={selectedId ?? ''} onChange={e => setDraft(d => ({ ...d, assetId: Number(e.target.value) }))} aria-label={t('social.company.projectAria')}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border-l)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13, marginBottom: 10 }}>
                  {options.map(a => <option key={a.id} value={a.id}>{`${a.name}`}</option>)}
                </select>
                <div style={{ marginBottom: 10 }}><Stars value={draft.rating} size={22} onPick={n => setDraft(d => ({ ...d, rating: n }))} /></div>
                <textarea value={draft.text} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} rows={3} maxLength={1000} placeholder={t('social.company.reviewPlaceholder')} aria-label={t('social.company.yourReview')}
                  style={fieldStyle} />
                <PBtn variant="accent" small style={{ marginTop: 10, opacity: draft.text.trim() && !busy ? 1 : 0.5 }} disabled={!draft.text.trim() || busy} onClick={submit}>{t('social.company.publishReview')}</PBtn>
              </>
            )}
            {error && <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--neg)', marginTop: 10, lineHeight: 1.45 }}>{error}</div>}
          </PCard>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {chip('all', t('social.company.allProjects'))}
          {projects.map(a => chip(a.id, a.name))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map(r => (
            <PCard key={r.id} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {r.authorAvatarUrl || r.authorAnonymous ? (
                  <button onClick={() => openAuthor(r)} aria-label={t('social.avatar.viewProfileOf', { name: r.author })} style={{ border: 'none', padding: 0, background: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex' }}>
                    <UserAvatar size={34} user={{ name: r.author, initial: r.author.slice(0, 1), gradient: 'var(--surface2)', id: r.authorId, avatarUrl: r.authorAvatarUrl, anonymous: r.authorAnonymous }} />
                  </button>
                ) : (
                  <button onClick={() => openAuthor(r)} aria-label={t('social.avatar.viewProfileOf', { name: r.author })}
                    style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, color: '#fff', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14,
                      background: isViewer(r) && viewer ? viewer.gradient : `hsl(${hashOf(r.author) % 360} 55% 50%)` }}>
                    {r.author.slice(0, 1)}
                  </button>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{r.author}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Stars value={r.rating} size={12} /><span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{localMonthLabel(r.date, months)}</span></div>
                </div>
                {r.isMine && editing?.id !== r.id && (onEdit || onDelete) && (
                  <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                    {onEdit && <button style={smallLink} onClick={() => setEditing({ id: r.id, rating: r.rating, text: r.text })}>{t('social.company.edit')}</button>}
                    {onDelete && <button style={smallLink} onClick={() => onDelete(r)}>{t('social.company.delete')}</button>}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <ProjectCode asset={r.asset} onClick={() => nav('detalle', r.asset)} />
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--sec)' }}>{r.asset.name}</span>
              </div>
              {editing?.id === r.id ? (
                <div>
                  <div style={{ marginBottom: 8 }}><Stars value={editing.rating} size={20} onPick={n => setEditing(e => (e ? { ...e, rating: n } : e))} /></div>
                  <textarea value={editing.text} onChange={e => setEditing(x => (x ? { ...x, text: e.target.value } : x))} rows={3} maxLength={1000} aria-label={t('social.company.editReview')} style={fieldStyle} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <PBtn variant="accent" small disabled={!editing.text.trim() || busy} style={{ opacity: editing.text.trim() && !busy ? 1 : 0.5 }} onClick={() => saveEdit(r)}>{t('social.company.save')}</PBtn>
                    <PBtn variant="secondary" small onClick={() => setEditing(null)}>{t('social.company.cancel')}</PBtn>
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55 }}>{r.text}</div>
              )}
            </PCard>
          ))}
          {shown.length === 0 && <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)' }}>{t('social.company.noReviews')}</div>}
        </div>
      </div>
    </div>
  );
}
