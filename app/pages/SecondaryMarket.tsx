import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { PCard, PBtn, PSection, PTag, PChip, PAvatar, PImg, Icons, CompanyTag } from '~/components/ui';
import { SECONDARY_LISTINGS, RWA_ASSETS, RWA_CATS, RWA_COUNTRIES, RWA_COMPANIES, fmtUSD2, type RwaAsset, type SecondaryListing } from '~/data';
import { goCheckout } from '~/lib/checkout';
import type { NavFn } from '~/lib/navigation';
import { useMobile } from '~/hooks/useMobile';
import { useMagnetScroll } from '~/hooks/useMagnetScroll';

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
  const hasFilters = cat !== 'Todos' || country !== 'Todos' || company !== 'Todos';

  return (
    <div style={{ marginBottom: pinned ? 0 : 20 }}>
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <div style={{ flex:1, position:'relative' }}>
          <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--ter)', pointerEvents:'none', display:'flex' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar activo, vendedor, categoría..."
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 14px 10px 38px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--font-b)', fontSize:13.5, outline:'none' }}
          />
        </div>
        <button onClick={() => setOpen(o => !o)}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 16px', borderRadius:12, border:`1.5px solid ${hasFilters ? 'var(--accent)' : 'var(--border)'}`, background: hasFilters ? 'var(--accent-bg)' : 'var(--surface)', color: hasFilters ? 'var(--accent-text)' : 'var(--sec)', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:13, fontWeight:600, flexShrink:0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Filtros {hasFilters && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', display:'inline-block' }}/>}
        </button>
        {hasFilters && (
          <button onClick={() => { setCat('Todos'); setCountry('Todos'); setCompany('Todos'); }}
            style={{ padding:'10px 14px', borderRadius:12, border:'1.5px solid var(--border)', background:'transparent', color:'var(--ter)', cursor:'pointer', fontSize:12, fontFamily:'var(--font-b)' }}>
            Limpiar
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} style={{ overflow:'hidden' }}>
            <div style={{ padding:'16px 18px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:14, maxHeight: pinned ? '55vh' : undefined, overflowY: pinned ? 'auto' : undefined, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:10 }}>
              <FilterGroup label="Categoría" value={cat} onChange={setCat} options={RWA_CATS} />
              <FilterGroup label="País" value={country} onChange={setCountry} options={RWA_COUNTRIES} />
              <FilterGroup label="Empresa" value={company} onChange={setCompany} options={RWA_COMPANIES} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sort chips */}
      <div className="no-scrollbar" style={{ display:'flex', gap:8, overflowX:'auto', overflowY:'hidden', margin: pinned ? '0 -14px' : 0, padding: pinned ? '0 14px' : 0 }}>
        <PChip label="Mayor descuento" active={sort==='descuento'} onClick={() => setSort('descuento')} />
        <PChip label="Mayor prima"     active={sort==='prima'}     onClick={() => setSort('prima')} />
        <PChip label="Más recientes"   active={sort==='reciente'}  onClick={() => setSort('reciente')} />
      </div>
    </div>
  );
}

type FilterGroupProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
};

function FilterGroup({ label, value, onChange, options }: FilterGroupProps) {
  return (
    <div>
      <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{label}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            style={{ padding:'5px 11px', borderRadius:999, border:`1.5px solid ${value===opt ? 'var(--accent)' : 'var(--border)'}`, background: value===opt ? 'var(--accent-bg)' : 'transparent', color: value===opt ? 'var(--accent-text)' : 'var(--sec)', cursor:'pointer', fontFamily:'var(--font-b)', fontSize:12, fontWeight: value===opt ? 700 : 400 }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Listing card (shared by the demo page and the live market) ──────────────
type ListingCardProps = {
  seller: string;
  /** Line under the seller's name (rating, verification). */
  sellerNote: ReactNode;
  /** Opens the seller's profile (demo); live sellers are wallets without a profile. */
  onSeller?: () => void;
  listed: string;
  asset: RwaAsset;
  qty: number | string;
  askPrice: number;
  realPrice: number;
  /** Ask vs. real price, in percent (negative = discount). */
  diff: number;
  tokenLife: string;
  onView: () => void;
  actions: ReactNode;
};

export function ListingCard({ seller, sellerNote, onSeller, listed, asset, qty, askPrice, realPrice, diff, tokenLife, onView, actions }: ListingCardProps) {
  const isDiscount = diff < 0;
  return (
    <PCard style={{ padding:'18px 20px' }}>
      {/* Seller */}
      <div onClick={onSeller} role={onSeller ? 'button' : undefined} title={onSeller ? `Ver perfil de ${seller}` : undefined}
        style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, ...(onSeller && { cursor:'pointer' }) }}>
        <PAvatar name={seller} size={32} />
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-b)', fontWeight:600, fontSize:13, color:'var(--text)' }}>{seller}</div>
          <div style={{ display:'flex', alignItems:'center', gap:4, color:'#F5A623' }}>
            {sellerNote}
          </div>
        </div>
        <span style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--ter)' }}>{listed}</span>
      </div>

      {/* Asset */}
      <div onClick={onView} style={{ display:'flex', gap:12, alignItems:'center', marginBottom:14, cursor:'pointer' }}>
        <PImg src={asset.img} height={56} style={{ width:78, borderRadius:12, flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:14.5, color:'var(--text)' }}>{asset.name}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4, flexWrap:'wrap' }}>
            <PTag label={`${qty} tokens`} color="neutral" />
            {asset.company && <CompanyTag company={asset.company} cat={asset.cat} size="sm" />}
          </div>
        </div>
      </div>

      {/* Price comparison */}
      <div style={{ background:'var(--surface2)', borderRadius:14, padding:'12px 16px', marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Pedido</div>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:22, color:'var(--text)', letterSpacing:'-0.03em' }}>{fmtUSD2(askPrice)}</div>
          </div>
          <PTag label={`${isDiscount ? '' : '+'}${diff.toFixed(1)}%`} color={isDiscount ? 'green' : 'red'} />
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Real</div>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:17, color:'var(--sec)', textDecoration:isDiscount ? 'line-through' : 'none' }}>{fmtUSD2(realPrice)}</div>
          </div>
        </div>
      </div>

      {/* Token life */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14, color:'var(--ter)' }}>
        {Icons.clock}
        <span style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--sec)' }}>
          Vida útil: <strong style={{ color:'var(--text)' }}>{tokenLife}</strong>
        </span>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        {actions}
      </div>
    </PCard>
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
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:14 }}>
      <div style={{ minWidth:0 }}>
        <h1 data-guide="secondary-title" style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:22, letterSpacing:'-0.03em', color:'var(--text)' }}>Mercado Secundario</h1>
        <p style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginTop:2 }}>Comprá y vendé tokens entre inversores{help}</p>
      </div>
      <button aria-label="Publicar venta" title="Publicar venta" data-guide="secondary-sell" onClick={onPublish} disabled={disabled}
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

// Photo-led listing card: the deal (discount, price vs real) on top of the
// project photo, seller and actions underneath.
type MobileListingCardProps = {
  asset: RwaAsset;
  /** Tokens on sale (the "N tokens" badge). */
  qty: number | string;
  /** What the buyer saves vs. the real price, in USD (shown on discounts). */
  saving: number;
  askPrice: number;
  realPrice: number;
  diff: number;
  tokenLife: string;
  seller: string;
  /** Line under the seller's name (rating · when it was listed). */
  sellerNote: ReactNode;
  onSeller?: () => void;
  onView: () => void;
  action: ReactNode;
  idx: number;
};

export function MobileListingCard({ asset, qty, saving, askPrice, realPrice, diff, tokenLife, seller, sellerNote, onSeller, onView, action, idx }: MobileListingCardProps) {
  const isDiscount = diff < 0;
  return (
    <motion.div data-guide="listing-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:Math.min(idx, 10)*0.05 }}>
      <PCard style={{ padding:0 }}>
        <div onClick={onView} style={{ position:'relative', cursor:'pointer' }}>
          <PImg src={asset.img} alt={asset.name} height={190}>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.78) 100%)' }} />
            <div style={{ position:'absolute', top:12, left:12, right:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ padding:'5px 10px', borderRadius:999, fontFamily:'var(--font-h)', fontWeight:800, fontSize:13,
                background: isDiscount ? '#4ade80' : '#f87171', color: '#06130a' }}>
                {isDiscount ? '' : '+'}{diff.toFixed(1)}%
              </span>
              <span style={{ padding:'5px 10px', borderRadius:999, fontFamily:'var(--font-b)', fontWeight:700, fontSize:12, background:'rgba(0,0,0,0.45)', color:'#fff', backdropFilter:'blur(6px)' }}>
                {qty} tokens
              </span>
            </div>
            <div style={{ position:'absolute', left:14, right:14, bottom:12, color:'#fff' }}>
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:19, letterSpacing:'-0.02em', lineHeight:1.15 }}>{asset.name}</div>
              <div style={{ fontFamily:'var(--font-b)', fontSize:12, color:'rgba(255,255,255,0.75)', marginTop:3 }}>
                {asset.company || 'KEYCHAIN'} · {asset.cat} · {tokenLife}
              </div>
            </div>
          </PImg>
        </div>

        <div style={{ padding:'14px 16px 16px' }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:10, marginBottom:12 }}>
            <div>
              <div style={{ fontFamily:'var(--font-b)', fontSize:10.5, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Precio por token</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:26, color:'var(--text)', letterSpacing:'-0.03em' }}>{fmtUSD2(askPrice)}</span>
                <span style={{ fontFamily:'var(--font-b)', fontSize:13, color:'var(--ter)', textDecoration: isDiscount ? 'line-through' : 'none' }}>{fmtUSD2(realPrice)}</span>
              </div>
            </div>
            {isDiscount && (
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--font-b)', fontSize:10.5, color:'var(--ter)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Ahorrás</div>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:15, color:'var(--pos)' }}>{fmtUSD2(saving)}</div>
              </div>
            )}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div onClick={onSeller} role={onSeller ? 'button' : undefined} title={onSeller ? `Ver perfil de ${seller}` : undefined}
              style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0, ...(onSeller && { cursor:'pointer' }) }}>
              <PAvatar name={seller} size={30} />
              <div style={{ minWidth:0 }}>
                <div style={{ fontFamily:'var(--font-b)', fontWeight:600, fontSize:12.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{seller}</div>
                <div style={{ fontFamily:'var(--font-b)', fontSize:11, color:'var(--ter)' }}>{sellerNote}</div>
              </div>
            </div>
            {action}
          </div>
        </div>
      </PCard>
    </motion.div>
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

  const enriched = useMemo(() => SECONDARY_LISTINGS.map((l): EnrichedListing => ({
    ...l,
    asset: RWA_ASSETS.find(a => a.id === l.assetId),
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
  }), [search, cat, country, company, rubro]);

  const sorted = useMemo(() => [...enriched].sort((a, b) => {
    if (sort === 'descuento') return a.diff - b.diff;
    if (sort === 'prima')     return b.diff - a.diff;
    return 0; // reciente: keep natural order
  }), [enriched, sort]);

  const mobile = useMobile();
  const buy = (l: EnrichedListing & { asset: RwaAsset }) => {
    goCheckout(nav, {
      title: 'Compra en mercado secundario', source: 'Mercado Secundario',
      // askPrice is per token (the branch divides it by qty again; fixed here as before).
      items: [{ name: l.asset.name, img: l.asset.img, qty: l.qty, unit: l.askPrice, meta: `Vende ${l.seller}` }],
      back: { route: 'secundario' }, done: { route: 'pertenencias', label: 'Ver en Mis Pertenencias' },
    });
  };

  const stats: Array<readonly [string, string]> = [
    ['Volumen 24h', '$184,200'],
    ['Listados activos', sorted.length.toString()],
    ['Descuento promedio', '-5.8%'],
    ['Operaciones 24h', '142'],
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
        title="Mercado Secundario"
        sub="Compra y venta P2P entre inversores. Compará precio pedido vs. precio real del token."
        action={<PBtn variant="primary">+ Publicar venta</PBtn>}
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

      {mobile ? <MagnetToolbar>{filterBar}</MagnetToolbar> : filterBar(false)}

      <div style={{ fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--ter)', marginBottom:16 }}>
        {sorted.length} listado{sorted.length !== 1 ? 's' : ''} activo{sorted.length !== 1 ? 's' : ''}
      </div>

      {/* Listings */}
      {mobile ? (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {sorted.map((l, idx) => {
            const isDiscount = l.diff < 0;
            return (
              <MobileListingCard key={l.id} idx={idx}
                asset={l.asset} qty={l.qty} saving={(l.realPrice - l.askPrice) * l.qty}
                askPrice={l.askPrice} realPrice={l.realPrice} diff={l.diff} tokenLife={l.tokenLife}
                seller={l.seller}
                sellerNote={<><span style={{ color:'#F5A623' }}>★</span> {l.sellerRep} · {l.listed}</>}
                onSeller={() => nav('usuario', l.seller)}
                onView={() => nav('detalle', l.asset)}
                action={
                  <PBtn variant={isDiscount ? 'accent' : 'secondary'} small onClick={isDiscount ? () => buy(l) : undefined} style={{ flexShrink:0, padding:'9px 18px' }}>
                    {isDiscount ? 'Comprar' : 'Ofertar'}
                  </PBtn>
                } />
            );
          })}
        </div>
      ) : (
      <div className="g-market-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:20 }}>
        {sorted.map((l, idx) => {
          const isDiscount = l.diff < 0;
          return (
            <motion.div key={l.id} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:idx*0.06 }}>
              <ListingCard
                seller={l.seller}
                sellerNote={<>
                  {Icons.star}
                  <span style={{ fontFamily:'var(--font-b)', fontSize:11.5, color:'var(--sec)' }}>{l.sellerRep} · verificado</span>
                </>}
                onSeller={() => nav('usuario', l.seller)}
                listed={l.listed}
                asset={l.asset}
                qty={l.qty}
                askPrice={l.askPrice}
                realPrice={l.realPrice}
                diff={l.diff}
                tokenLife={l.tokenLife}
                onView={() => nav('detalle', l.asset)}
                actions={<>
                  <PBtn variant={isDiscount ? 'accent' : 'secondary'} style={{ flex:1 }} small
                    onClick={isDiscount ? () => buy(l) : undefined}>
                    {isDiscount ? 'Comprar' : 'Hacer oferta'}
                  </PBtn>
                  <PBtn variant="ghost" small onClick={() => nav('detalle', l.asset)}>Ver</PBtn>
                </>}
              />
            </motion.div>
          );
        })}
      </div>
      )}

      {sorted.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--ter)', fontFamily:'var(--font-b)', fontSize:14 }}>
          No hay listados activos con esos filtros.
        </div>
      )}
    </div>
  );
}
