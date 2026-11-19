import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { PCard, PBtn, PSection, PChip } from '~/components/ui';
import { useCatalog } from '~/lib/catalog';
import { SECONDARY_LISTINGS, RWA_CATS, RWA_COUNTRIES, RWA_COMPANIES, fmtUSD2, type RwaAsset, type SecondaryListing } from '~/data';
import { goCheckout } from '~/lib/checkout';
import CategoryCarousel from '~/components/CategoryCarousel';
import type { NavFn } from '~/lib/navigation';
import { useMobile } from '~/hooks/useMobile';
import { useMagnetScroll } from '~/hooks/useMagnetScroll';
import { useDataLabel } from '~/features/market/i18n';
import { useT } from '~/i18n/useT';

export type SortKey = 'descuento' | 'prima' | 'reciente';
type EnrichedListing = SecondaryListing & { asset: RwaAsset | undefined; diff: number };

// ─── Filter bar ───────────────────────────────────────────────────────────────
export type FilterBarProps = {
  search: string; setSearch: (v: string) => void;
  cat: string; setCat: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  company: string; setCompany: (v: string) => void;
  sort: SortKey; setSort: (v: SortKey) => void;
  /** Mobile: the bar is pinned at the top of the page (magnet toolbar). */
  pinned?: boolean;
};

export function FilterBar({ search, setSearch, cat, setCat, country, setCountry, company, setCompany, sort, setSort, pinned }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const { t } = useT('market');
  const dataLabel = useDataLabel();
  const hasFilters = cat !== 'Todos' || country !== 'Todos' || company !== 'Todos';

  return (
    <div style={{ marginBottom: pinned ? 0 : 20 }}>
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <div style={{ flex:1, position:'relative' }}>
          <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--ter)', pointerEvents:'none', display:'flex' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('secondary.searchPlaceholder')}
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 14px 10px 38px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--font-b)', fontSize:13.5, outline:'none' }}
          />
        </div>
        <button onClick={() => setOpen(o => !o)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 16px', borderRadius:12, border:`1.5px solid ${hasFilters ? 'var(--accent)' : 'var(--border)'}`, background: hasFilters ? 'var(--accent-bg)' : 'var(--surface)', color: hasFilters ? 'var(--accent-text)' : 'var(--sec)', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:13, fontWeight:600, flexShrink:0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          {t('filters.title')} {hasFilters && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', display:'inline-block' }}/>}
        </button>
        {hasFilters && (
          <button onClick={() => { setCat('Todos'); setCountry('Todos'); setCompany('Todos'); }}
            style={{ padding:'10px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'transparent', color:'var(--ter)', cursor:'pointer', fontSize:12, fontFamily:'var(--font-b)' }}>
            {t('filters.clear')}
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} style={{ overflow:'hidden' }}>
            <div style={{ padding:'16px 18px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:14, maxHeight: pinned ? '55vh' : undefined, overflowY: pinned ? 'auto' : undefined, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:10 }}>
              <FilterGroup label={t('filters.category')} value={cat} onChange={setCat} options={RWA_CATS} labels={RWA_CATS.map(c => dataLabel('categories', c))} />
              <FilterGroup label={t('filters.country')} value={country} onChange={setCountry} options={RWA_COUNTRIES} labels={RWA_COUNTRIES.map(c => dataLabel('countries', c))} />
              <FilterGroup label={t('filters.company')} value={company} onChange={setCompany} options={RWA_COMPANIES} labels={RWA_COMPANIES.map(c => (c === 'Todos' ? dataLabel('countries', c) : c))} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sort chips */}
      <div className="no-scrollbar" style={{ display:'flex', gap:8, overflowX:'auto', overflowY:'hidden', margin: pinned ? '0 -14px' : 0, padding: pinned ? '0 14px' : 0 }}>
        <PChip label={t('filters.sortDiscount')} active={sort==='descuento'} onClick={() => setSort('descuento')} />
        <PChip label={t('filters.sortPremium')} active={sort==='prima'}     onClick={() => setSort('prima')} />
        <PChip label={t('filters.sortRecent')} active={sort==='reciente'}  onClick={() => setSort('reciente')} />
      </div>
    </div>
  );
}

type FilterGroupProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  labels?: readonly string[];
};

function FilterGroup({ label, value, onChange, options, labels }: FilterGroupProps) {
  return (
    <div>
      <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{label}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {options.map((opt, i) => (
          <button key={opt} onClick={() => onChange(opt)}
            style={{ padding:'5px 11px', borderRadius:999, border:`1.5px solid ${value===opt ? 'var(--accent)' : 'var(--border)'}`, background: value===opt ? 'var(--accent-bg)' : 'transparent', color: value===opt ? 'var(--accent-text)' : 'var(--sec)', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:12, fontWeight: value===opt ? 700 : 400 }}>
            {labels ? labels[i] : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Listing card (shared by the demo page and the live market) ──────────────
// Photo-led card: issuer and price vs. primary on top; asset, seller and the key
// numbers over the photo. The whole card opens the asset; the actions show on
// hover/focus with a mouse and are always visible on touch screens.
type ListingCardProps = {
  seller: string;
  /** Opens the seller's profile (demo); live sellers are wallets without a profile. */
  onSeller?: () => void;
  asset: RwaAsset;
  qty: number | string;
  askPrice: number;
  /** Ask vs. primary (reference) price, in percent (negative = below primary). */
  diff: number;
  onView: () => void;
  actions: ReactNode;
};

const issuerInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
};
const fmtCompactUSD = (n: number): string =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : fmtUSD2(n);

export function ListingCard({ seller, onSeller, asset, qty, askPrice, diff, onView, actions }: ListingCardProps) {
  const { t } = useT('market');
  const dataLabel = useDataLabel();
  const below = diff < 0;
  const pct = Math.abs(diff);
  const vsPrimary = pct < 0.05 ? t('listing.primaryPrice') : t(below ? 'listing.belowPrimary' : 'listing.abovePrimary', { pct: pct.toFixed(pct < 10 ? 1 : 0) });
  const issuer = asset.company || 'BRIKME';
  return (
    <article className="sm-card">
      <img className="sm-card-img" src={asset.img} alt="" loading="lazy" decoding="async" draggable={false} />
      <span className="sm-card-shade" aria-hidden="true" />
      <button type="button" className="sm-card-hit" onClick={onView} aria-label={t('listing.view', { name: asset.name })} />
      <header className="sm-card-top">
        <span className="sm-card-logo" aria-hidden="true">{issuerInitials(issuer)}</span>
        <span className="sm-card-issuer"><strong>{issuer}</strong><em>{dataLabel('categories', asset.cat)}</em></span>
        <span className="sm-chip sm-chip-trade">{t('listing.onSale')}</span>
        <span className={`sm-chip ${below ? 'sm-chip-below' : 'sm-chip-above'}`} title={vsPrimary}>
          <span className="sm-chip-long">{vsPrimary}</span>
          <span className="sm-chip-short">{pct < 0.05 ? '0%' : `${below ? '−' : '+'}${pct.toFixed(pct < 10 ? 1 : 0)}%`}</span>
        </span>
      </header>
      <div className="sm-card-body">
        <h3>{asset.name}</h3>
        <p>
          {t('listing.sellerPrefix')} {onSeller
            ? <button type="button" className="sm-card-seller" onClick={onSeller} title={t('listing.sellerProfile', { seller })}>{seller}</button>
            : seller} · {t('listing.tokens', { qty })}
        </p>
        <dl className="sm-card-stats">
          <div><dt>{t('listing.price')}</dt><dd>{fmtUSD2(askPrice)}</dd></div>
          <div><dt>{t('listing.apy')}</dt><dd>{asset.apy.toFixed(1)}%</dd></div>
          <div><dt>{t('listing.valuation')}</dt><dd>{fmtCompactUSD(asset.valuation)}</dd></div>
        </dl>
        <div className="sm-card-actions">{actions}</div>
      </div>
    </article>
  );
}

// ─── Mobile pieces (shared by the demo page and the live market) ─────────────
// One dark summary card instead of four stat boxes.
export function MobileSummary({ stats }: { stats: ReadonlyArray<readonly [string, string]> }) {
  const [first, ...rest] = stats;
  if (!first) return null;
  const [k0, v0] = first;
  return (
    <div style={{ position:'relative', overflow:'hidden', borderRadius:20, padding:'18px 18px 16px', marginBottom:14,
      background:'linear-gradient(140deg, #14161c 0%, #1d2230 55%, #10131a 100%)', color:'#fff', boxShadow:'var(--sh-md)' }}>
      <div style={{ position:'absolute', top:-60, right:-40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, rgba(74,222,128,0.28), transparent 70%)', filter:'blur(10px)' }} />
      <div style={{ position:'relative' }}>
        <div style={{ fontFamily:'var(--font-b)', fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)' }}>{k0}</div>
        <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:30, letterSpacing:'-0.03em', margin:'2px 0 14px' }}>{v0}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:8 }}>
          {rest.map(([k, v]) => (
            <div key={k} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'9px 10px', minWidth:0 }}>
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:16 }}>{v}</div>
              <div style={{ fontFamily:'var(--font-b)', fontSize:10.5, color:'rgba(255,255,255,0.6)', lineHeight:1.25, marginTop:2 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mobile page header: title, subtitle and the round "+" (publish a sale). */
export function MobileMarketHeader({ onPublish, disabled, help }: { onPublish?: () => void; disabled?: boolean; help?: ReactNode }) {
  const { t } = useT('market');
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:14 }}>
      <div style={{ minWidth:0 }}>
        <h1 data-guide="secondary-title" style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:22, letterSpacing:'-0.03em', color:'var(--text)' }}>{t('secondary.title')}</h1>
        <p style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginTop:2 }}>{t('secondary.subMobile')}{help}</p>
      </div>
      <button aria-label={t('secondary.publishAria')} title={t('secondary.publishAria')} data-guide="secondary-sell" onClick={onPublish} disabled={disabled}
        style={{ width:44, height:44, flexShrink:0, borderRadius:14, border:'none', cursor:'pointer', background:'var(--accent)', color:'var(--accent-fg)', fontSize:24, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
    </div>
  );
}

/** Mobile "magnet" toolbar (same as the Feed / Mercado Primario): pins the filter bar at the top with a snap. */
export function MagnetToolbar({ children }: { children: (pinned: boolean) => ReactNode }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { stuck } = useMagnetScroll(sentinelRef, 0, true);
  const snap = useAnimationControls();
  useEffect(() => {
    if (stuck) void snap.start({ y: [-14, 4, 0], scale: [0.985, 1.006, 1], transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] } });
  }, [stuck, snap]);
  return (
    <>
      <div ref={sentinelRef} />
      <div style={{ position:'sticky', top:0, zIndex:30, margin:'0 -14px 6px' }}>
        <motion.div animate={snap}
          style={{ padding:'10px 14px', background: stuck ? 'var(--bg)' : 'transparent', transition:'background 0.2s ease, box-shadow 0.2s ease',
            boxShadow: stuck ? '0 10px 24px -12px rgba(0,0,0,0.45)' : 'none' }}>
          {children(true)}
        </motion.div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type SecondaryMarketProps = { nav: NavFn; rubro?: string };

export default function SecondaryMarket({ nav, rubro = 'Todos' }: SecondaryMarketProps) {
  const [search, setSearch]   = useState('');
  const [sort, setSort]       = useState<SortKey>('descuento');
  const [cat, setCat]         = useState('Todos');
  const [country, setCountry] = useState('Todos');
  const [company, setCompany] = useState('Todos');
  const { t } = useT('market');
  const { byId } = useCatalog();

  const enriched = useMemo(() => SECONDARY_LISTINGS.map((l): EnrichedListing => ({
    ...l,
    asset: byId(l.assetId),
    diff: (l.askPrice / l.realPrice - 1) * 100,
  })).filter((l): l is EnrichedListing & { asset: RwaAsset } => {
    const a = l.asset;
    if (!a) return false;
    if (rubro !== 'Todos' && a.cat !== rubro) return false;
    if (cat !== 'Todos' && a.cat !== cat) return false;
    if (country !== 'Todos' && a.country !== country) return false;
    if (company !== 'Todos' && a.company !== company) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || l.seller.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q);
    }
    return true;
  }), [search, cat, country, company, rubro, byId]);

  const sorted = useMemo(() => [...enriched].sort((a, b) => {
    if (sort === 'descuento') return a.diff - b.diff;
    if (sort === 'prima')     return b.diff - a.diff;
    return 0; // reciente: keep natural order
  }), [enriched, sort]);

  const mobile = useMobile();
  const buy = (l: EnrichedListing & { asset: RwaAsset }) => {
    goCheckout(nav, {
      title: t('secondary.buyTitle'), source: 'Mercado Secundario',
      // askPrice is per token (the branch divides it by qty again; fixed here as before).
      items: [{ name: l.asset.name, img: l.asset.img, qty: l.qty, unit: l.askPrice, meta: t('secondary.soldBy', { seller: l.seller }) }],
      back: { route: 'secundario' }, done: { route: 'pertenencias', label: t('secondary.viewInHoldings') },
    });
  };

  const stats: Array<readonly [string, string]> = [
    [t('secondary.volume24h'), '$184,200'],
    [t('secondary.activeListings'), sorted.length.toString()],
    [t('secondary.avgDiscount'), '-5.8%'],
    [t('secondary.trades24h'), '142'],
  ];

  const filterBar = (pinned: boolean) => (
    <FilterBar search={search} setSearch={setSearch} cat={cat} setCat={setCat}
      country={country} setCountry={setCountry} company={company} setCompany={setCompany}
      sort={sort} setSort={setSort} pinned={pinned} />
  );

  return (
    <div className="g-page" style={{ padding:'28px 32px 40px', maxWidth:1200, margin:'0 auto' }}>
      {mobile ? <MobileMarketHeader /> : (
      <PSection
        title={t('secondary.title')}
        sub={t('secondary.sub')}
        action={<PBtn variant="primary">{t('secondary.publish')}</PBtn>}
      />
      )}

      {/* Stats */}
      {mobile ? <MobileSummary stats={stats} /> : (
      <div className="g-kpi" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:26 }}>
        {stats.map(([k, v], idx) => (
          <motion.div key={k} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.07 }}>
            <PCard style={{ padding:'16px 20px' }}>
              <div style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{k}</div>
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:22, color:'var(--text)', letterSpacing:'-0.03em' }}>{v}</div>
            </PCard>
          </motion.div>
        ))}
      </div>
      )}

      <CategoryCarousel categories={RWA_CATS} value={cat} onChange={setCat} />

      {mobile ? <MagnetToolbar>{filterBar}</MagnetToolbar> : filterBar(false)}

      <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginBottom:16 }}>
        {t(sorted.length === 1 ? 'secondary.countOne' : 'secondary.countMany', { count: sorted.length })}
      </div>

      {/* Listings */}
      <div className="g-market-grid" style={{ display:'grid', gridTemplateColumns: mobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(auto-fill,minmax(260px,1fr))', gap: mobile ? 10 : 20 }}>
        {sorted.map((l, idx) => {
          const isDiscount = l.diff < 0;
          return (
            <motion.div key={l.id} data-guide="listing-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:Math.min(idx, 10)*0.06 }}>
              <ListingCard
                seller={l.seller}
                onSeller={() => nav('usuario', l.seller)}
                asset={l.asset}
                qty={l.qty}
                askPrice={l.askPrice}
                diff={l.diff}
                onView={() => nav('detalle', l.asset)}
                actions={
                  <PBtn variant={isDiscount ? 'accent' : 'secondary'} style={{ flex:1 }} small
                    onClick={isDiscount ? () => buy(l) : undefined}>
                    {isDiscount ? t('secondary.buy') : t('secondary.makeOffer')}
                  </PBtn>
                }
              />
            </motion.div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:14 }}>
          {t('secondary.emptyFiltered')}
        </div>
      )}
    </div>
  );
}
