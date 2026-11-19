import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { PCard, PImg, Icons } from '~/components/ui';
import { ProjectCode } from '~/components/social/FeedPostCard';
import { fmtUSD } from '~/data';
import type { NavFn } from '~/lib/navigation';
import type { SocialAsset } from '~/lib/social/types';

// The marketplace project card (Tokenizaciones). Reused wherever projects are
// listed — company profile projects, a person's investments — so they all
// look the same. Every card is photo-led: issuer and status over the top of
// the photo, name, location, stats and funding over a dark scrim at the bottom.
// `showCode` adds the project identifier next to the name; `holding`
// ({ tokens, current, invested, yieldEarned }) adds a strip with that person's
// position in the project, plus optional `actions` buttons. `asset` is a demo
// RwaAsset or a live CatalogAsset (its pool adds the "On-chain" tag).
// The mc-* class hooks drive the compact 2-per-row layout on phones (global.css).

/** A person's position in the project, shown under the card. */
export type AssetCardHolding = { tokens: number; current: number; invested: number; yieldEarned?: number };

export type AssetCardProps = {
  asset: SocialAsset;
  nav: NavFn;
  showCode?: boolean;
  holding?: AssetCardHolding | null;
  actions?: ReactNode;
  /** First cards above the fold: load their photo eagerly. */
  priority?: boolean;
};

// ─── Shared photo-card pieces (also used by the secondary market) ────────────

const PILL: CSSProperties = { display:'inline-flex', alignItems:'center', gap:5, height:24, padding:'0 10px', borderRadius:999, fontFamily:'var(--font-b)', fontSize:11.5, fontWeight:700, whiteSpace:'nowrap' };

export type PillTone = 'live' | 'dark' | 'gain' | 'warn' | 'chain';
const TONES: Record<PillTone, CSSProperties> = {
  live:  { background:'rgba(22,163,74,0.95)', color:'#fff' },
  dark:  { background:'rgba(0,0,0,0.5)', color:'#fff', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)' },
  gain:  { background:'rgba(22,163,74,0.95)', color:'#fff' },
  warn:  { background:'#F3B200', color:'#000' },
  chain: { background:'rgba(130,71,229,0.92)', color:'#fff' },
};

export function CardPill({ tone, dot, children }: { tone: PillTone; dot?: boolean; children: ReactNode }) {
  return (
    <span style={{ ...PILL, ...TONES[tone] }}>
      {dot && <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor' }} />}
      {children}
    </span>
  );
}

const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

/** Issuer square (initials, or the La 33 mark) + name and category, over the photo. */
export function CardIssuer({ name, sub, own }: { name: string; sub?: ReactNode; own?: boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
      <span style={{ width:36, height:36, flexShrink:0, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
        background: own ? '#000' : 'rgba(255,255,255,0.94)', color:'#1a1a1a', fontFamily:'var(--font-b)', fontSize:12.5, fontWeight:700 }}>
        {own ? <img src="/la33/la33-icon.svg" alt="" width={22} height={22} style={{ width:22, height:22 }} /> : initials(name)}
      </span>
      <div style={{ minWidth:0, lineHeight:1.2 }}>
        <div style={{ fontFamily:'var(--font-b)', fontSize:14, fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</div>
        {sub && <div style={{ fontFamily:'var(--font-b)', fontSize:12, color:'rgba(255,255,255,0.72)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sub}</div>}
      </div>
    </div>
  );
}

/** One stat over the scrim: small uppercase label, big value. */
type OverlayStatProps = { label: string; value: string; align?: CSSProperties['alignItems']; guide?: string };

function OverlayStat({ label, value, align = 'flex-start', guide }: OverlayStatProps) {
  return (
    <div data-guide={guide} style={{ display:'flex', flexDirection:'column', gap:4, alignItems:align, minWidth:0 }}>
      <div style={{ fontSize:11, fontFamily:'var(--font-b)', fontWeight:600, color:'rgba(255,255,255,0.72)', letterSpacing:'0.08em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{label}</div>
      <div style={{ fontSize:22, fontFamily:'var(--font-h)', fontWeight:700, color:'#fff', letterSpacing:'-0.02em', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>{value}</div>
    </div>
  );
}

export type PhotoCardProps = {
  img: string;
  alt: string;
  onClick?: () => void;
  priority?: boolean;
  guide?: string;
  topLeft: ReactNode;
  topRight?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** [label, value, data-guide?] — three of them, laid out left / center / right. */
  stats: ReadonlyArray<readonly [label: string, value: string, guide?: string]>;
  footer?: ReactNode;
};

export function PhotoCard({ img, alt, onClick, priority, guide, topLeft, topRight, title, subtitle, stats, footer }: PhotoCardProps) {
  return (
    <PCard guide={guide} className="market-card market-card-full" onClick={onClick} style={{ position:'relative', borderRadius:18 }}>
      <PImg src={img} alt={alt} height="100%" style={{ position:'absolute', inset:0 }} priority={priority}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          background:'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.08) 26%, rgba(0,0,0,0.30) 52%, rgba(0,0,0,0.90) 100%)' }} />
        <div style={{ position:'absolute', top:16, left:16, right:16, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
          <div className="mc-company" style={{ flex:1, minWidth:0 }}>{topLeft}</div>
          {topRight && <div className="mc-badges" style={{ display:'flex', gap:6, flexShrink:0, marginTop:2 }}>{topRight}</div>}
        </div>
        <div className="mc-overlay" style={{ position:'absolute', left:0, right:0, bottom:0, padding:'0 22px 22px' }}>
          <div className="mc-name" style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:19, color:'#fff', letterSpacing:'-0.02em', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</div>
          {subtitle && (
            <div className="mc-loc" style={{ display:'flex', alignItems:'center', gap:6, marginTop:5, color:'rgba(255,255,255,0.82)', fontFamily:'var(--font-b)', fontSize:13.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{subtitle}</div>
          )}
          <div className="mc-stats" style={{ display:'flex', justifyContent:'space-between', gap:8, marginTop:16 }}>
            {stats.map(([l, v, g], i) => (
              <OverlayStat key={l} label={l} value={v} guide={g} align={i === 0 ? 'flex-start' : i === stats.length - 1 ? 'flex-end' : 'center'} />
            ))}
          </div>
          {footer}
        </div>
      </PImg>
    </PCard>
  );
}

// ─── Primary market card ──────────────────────────────────────────────────────

export default function AssetCard({ asset: a, nav, showCode, holding, actions, priority }: AssetCardProps) {
  const left = a.totalTokens - Math.round(a.totalTokens * a.sold / 100);
  const own = a.issuer === 'keychain';
  const funded = a.sold >= 100;
  const status = funded ? <CardPill tone="dark">Financiado</CardPill>
    : a.stage === 'Recaudación' ? <CardPill tone="live" dot>En vivo</CardPill>
    : <CardPill tone="dark">{a.stage}</CardPill>;

  return (
    // With a holding strip below, the wrapper is taller than the card: only
    // lift it on hover — a shadow here would draw a box around card + strip.
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} whileHover={{ y:-4 }} transition={{ duration:0.2 }} style={{ borderRadius:18 }}>
      <PhotoCard
        guide="asset-card"
        img={a.img} alt={a.name} priority={priority}
        onClick={() => nav('detalle', a)}
        topLeft={<CardIssuer name={own ? 'La 33' : (a.company || 'La 33')} sub={a.cat} own={own} />}
        topRight={<>{a.pool?.status === 'active' && <CardPill tone="chain">On-chain</CardPill>}{status}</>}
        title={<>{showCode && <ProjectCode asset={a} overlay />}{a.name}</>}
        subtitle={<>{Icons.location}<span>{a.location}</span></>}
        stats={[
          ['Token', fmtUSD(a.tokenPrice)],
          ['APY est.', `${a.apy}%`, 'asset-apy'],
          ['Disponibles', left > 0 ? left.toLocaleString('en-US') : 'Agotado'],
        ]}
        footer={
          <div data-guide="asset-funded" className="mc-funded" style={{ marginTop:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
              <span style={{ fontFamily:'var(--font-b)', fontSize:13, color:'rgba(255,255,255,0.85)' }}>Financiado</span>
              <span style={{ fontFamily:'var(--font-b)', fontSize:13, fontWeight:600, color:'#fff' }}>{a.sold}%</span>
            </div>
            <div style={{ height:4, borderRadius:999, background:'rgba(255,255,255,0.25)', overflow:'hidden' }}>
              <div style={{ width:`${Math.min(100, a.sold)}%`, height:'100%', borderRadius:999, background:'#fff' }} />
            </div>
          </div>
        }
      />
      {holding && <HoldingStrip holding={holding} actions={actions} />}
    </motion.div>
  );
}

// The person's position, as a strip under the card (same for every card so
// the cards themselves keep identical sizes).
function HoldingStrip({ holding: h, actions }: { holding: AssetCardHolding; actions?: ReactNode }) {
  const diff = h.invested ? ((h.current - h.invested) / h.invested) * 100 : 0;
  return (
    <div className="mc-holding" style={{
      display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'11px 17px',
      fontFamily:'var(--font-b)', fontSize:12.5, color:'var(--sec)',
      marginTop:8, borderRadius:14, border:'1px solid var(--border-l)', background:'var(--surface)',
    }}>
      <span><b style={{ color:'var(--text)' }}>{h.tokens}</b> tokens</span>
      <span>Valor <b style={{ color:'var(--text)' }}>{fmtUSD(h.current)}</b></span>
      <span style={{ fontWeight:700, color: diff >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}%</span>
      {/* Clicks on the actions must not open the project behind them. */}
      {actions && <span onClick={e => e.stopPropagation()} style={{ display:'flex', gap:6 }}>{actions}</span>}
    </div>
  );
}
