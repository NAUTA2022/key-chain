import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PArea, PDonut, Icons } from '../components/ui';
import { MY_HOLDINGS, MY_BALANCES, RWA_ASSETS, fmtUSD2, FACT_TOKEN } from '../data';
import InvestAdvisor from '../components/InvestAdvisor';

/* ── Interactive portfolio area chart ── */
function PortfolioChart({ data, period }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const W = 560, H = 150, PAD_L = 52, PAD_R = 16, PAD_T = 10, PAD_B = 28;
  const cW = W - PAD_L - PAD_R, cH = H - PAD_T - PAD_B;

  const pts = data.pts;
  const minV = Math.min(...pts), maxV = Math.max(...pts);
  const range = maxV - minV || 1;
  const toX = i => PAD_L + (i / (pts.length - 1)) * cW;
  const toY = v => PAD_T + cH - ((v - minV) / range) * cH;

  // Smooth path via Catmull-Rom → cubic bezier
  const smooth = () => {
    if (pts.length < 2) return '';
    const coords = pts.map((v, i) => [toX(i), toY(v)]);
    let d = `M${coords[0][0]},${coords[0][1]}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[Math.max(i - 1, 0)];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[Math.min(i + 2, coords.length - 1)];
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
    }
    return d;
  };
  const linePath = smooth();
  const areaPath = linePath
    ? `${linePath} L${toX(pts.length - 1)},${PAD_T + cH} L${PAD_L},${PAD_T + cH} Z`
    : '';

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    val: minV + t * range,
    y: PAD_T + cH - t * cH,
  }));

  const fmtK = v => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${Math.round(v)}`;

  const handleMouseMove = e => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width) - PAD_L;
    const idx = Math.round((mx / cW) * (pts.length - 1));
    const clamped = Math.max(0, Math.min(pts.length - 1, idx));
    setHover(clamped);
  };

  // Period stats
  const pctChange = ((pts[pts.length - 1] / pts[0] - 1) * 100).toFixed(1);
  const isPos = pctChange >= 0;
  const minPt = Math.min(...pts), maxPt = Math.max(...pts);

  const hx = hover !== null ? toX(hover) : null;
  const hy = hover !== null ? toY(pts[hover]) : null;

  return (
    <div style={{ marginTop: 8 }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%" height={H}
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="pchart-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3078ff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3078ff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="pchart-clip">
            <rect x={PAD_L} y={PAD_T} width={cW} height={cH} />
          </clipPath>
        </defs>

        {/* Grid lines + Y labels */}
        {yTicks.map(({ val, y }, i) => (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={PAD_L + cW} y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={PAD_L - 6} y={y + 4} textAnchor="end"
              fill="rgba(255,255,255,0.28)" fontSize="9" fontFamily="var(--font-b)">
              {fmtK(val)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#pchart-grad)" clipPath="url(#pchart-clip)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#3078ff" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" clipPath="url(#pchart-clip)" />

        {/* Crosshair */}
        {hover !== null && (
          <>
            <line x1={hx} y1={PAD_T} x2={hx} y2={PAD_T + cH}
              stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hx} cy={hy} r={4} fill="#3078ff" stroke="white" strokeWidth="1.5" />
            {/* Tooltip */}
            {(() => {
              const tw = 96, th = 36;
              const tx = Math.min(Math.max(hx - tw / 2, PAD_L), PAD_L + cW - tw);
              const ty = hy - th - 8 < PAD_T ? hy + 10 : hy - th - 8;
              const monthIdx = Math.round(hover / (pts.length - 1) * (data.labels.length - 1));
              const label = data.labels[Math.min(monthIdx, data.labels.length - 1)];
              return (
                <g>
                  <rect x={tx} y={ty} width={tw} height={th} rx="6"
                    fill="rgba(15,20,40,0.92)" stroke="rgba(48,120,255,0.4)" strokeWidth="1" />
                  <text x={tx + tw / 2} y={ty + 13} textAnchor="middle"
                    fill="rgba(255,255,255,0.55)" fontSize="9" fontFamily="var(--font-b)">{label}</text>
                  <text x={tx + tw / 2} y={ty + 27} textAnchor="middle"
                    fill="white" fontSize="11.5" fontWeight="700" fontFamily="var(--font-b)">
                    {fmtK(pts[hover])}
                  </text>
                </g>
              );
            })()}
          </>
        )}
      </svg>

      {/* Bottom stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
          Hace {period} · {fmtK(data.start)}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            Min {fmtK(minPt)} · Max {fmtK(maxPt)}
          </span>
          <span style={{
            fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 700,
            color: isPos ? '#4ade80' : '#f87171',
            background: isPos ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            padding: '2px 8px', borderRadius: 6,
          }}>
            {isPos ? '+' : ''}{pctChange}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Parachute gift box airdrop animation ── */
function AirdropBox({ tokens, symbol, claimed, future, onClaim }) {
  const [dropping, setDrop] = useState(false);
  const [done, setDone] = useState(claimed);

  const trigger = () => {
    if (done || future) return;
    setDrop(true);
    setTimeout(() => { setDone(true); setDrop(false); onClaim?.(); }, 1800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <AnimatePresence>
        {dropping && (
          <motion.div
            key="drop"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 14 }}
            style={{ fontSize: 28, lineHeight: 1, userSelect: 'none' }}
          >
            🪂🎁
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileHover={!done && !future ? { scale: 1.06, y: -2 } : {}}
        whileTap={!done && !future ? { scale: 0.94 } : {}}
        onClick={trigger}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 10, cursor: done || future ? 'default' : 'pointer',
          background: done ? 'rgba(74,222,128,0.12)' : future ? 'rgba(255,255,255,0.05)' : 'rgba(48,120,255,0.18)',
          border: `1px solid ${done ? 'rgba(74,222,128,0.3)' : future ? 'rgba(255,255,255,0.08)' : 'rgba(48,120,255,0.35)'}`,
        }}
      >
        <span style={{ fontSize: 14 }}>{done ? '✅' : future ? '🔒' : '🎁'}</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 12.5, color: done ? '#4ade80' : future ? 'var(--ter)' : 'var(--text)' }}>
            {tokens.toLocaleString()} {symbol}
          </div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 9.5, color: 'var(--ter)' }}>
            {done ? 'Reclamado' : future ? 'Próximamente' : 'Tap para reclamar'}
          </div>
        </div>
      </motion.button>
    </div>
  );
}

/* ── Full-width horizontal roadmap ── */
function RoadmapKYCN() {
  const [active, setActive] = useState(null);
  const [claimed, setClaimed] = useState({});
  const doneCount = ROADMAP.filter(r => r.done).length;
  const pct = (doneCount / ROADMAP.length) * 100;

  return (
    <div className="glow-card glass-card" style={{ padding: '24px 28px', borderRadius: 20, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Roadmap KYCN</div>
          <div style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, fontWeight: 700, color: '#4ade80' }}>{doneCount}/{ROADMAP.length} completados</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>Progreso global</div>
          <div style={{ width: 120, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #3078ff, #4ade80)', borderRadius: 3 }} />
          </div>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: '#4ade80' }}>{Math.round(pct)}%</div>
        </div>
      </div>

      {/* Horizontal timeline */}
      <div style={{ position: 'relative', paddingBottom: 4 }}>
        {/* Track line */}
        <div style={{ position: 'absolute', top: 18, left: '4%', right: '4%', height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, zIndex: 0 }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #3078ff, #4ade80)', borderRadius: 2 }} />
        </div>

        {/* Nodes */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ROADMAP.length}, 1fr)`, position: 'relative', zIndex: 1 }}>
          {ROADMAP.map((r, i) => {
            const isActive = active === i;
            const isCurrent = !r.done && (i === 0 || ROADMAP[i-1].done);
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setActive(isActive ? null : i)}>
                {/* Node circle */}
                <motion.div
                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.92 }}
                  animate={isCurrent ? { boxShadow: ['0 0 0 0 rgba(48,120,255,0.6)', '0 0 0 8px rgba(48,120,255,0)', '0 0 0 0 rgba(48,120,255,0)'] } : {}}
                  transition={isCurrent ? { duration: 1.8, repeat: Infinity } : {}}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: r.done ? 'linear-gradient(135deg, #22c55e, #4ade80)' : isCurrent ? '#3078ff' : 'rgba(255,255,255,0.08)',
                    border: `2px solid ${r.done ? '#4ade80' : isCurrent ? '#3078ff' : 'rgba(255,255,255,0.12)'}`,
                    boxShadow: r.done ? '0 0 14px rgba(74,222,128,0.4)' : isCurrent ? '0 0 14px rgba(48,120,255,0.5)' : 'none',
                    transition: 'all 0.2s',
                    outline: isActive ? `2px solid ${r.done ? '#4ade80' : '#3078ff'}` : 'none',
                    outlineOffset: 3,
                  }}
                >
                  {r.done
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : isCurrent
                      ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                      : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                  }
                </motion.div>

                {/* Quarter label */}
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 10, fontWeight: 700, color: r.done ? '#4ade80' : isCurrent ? '#3078ff' : 'var(--ter)', marginTop: 8, letterSpacing: '0.04em' }}>{r.q}</div>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 12, color: r.done || isCurrent ? 'var(--text)' : 'var(--sec)', marginTop: 2, textAlign: 'center', lineHeight: 1.2 }}>{r.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {active !== null && (
          <motion.div
            key={active}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            {(() => {
              const r = ROADMAP[active];
              const isCurrent = !r.done && (active === 0 || ROADMAP[active-1].done);
              const accentColor = r.done ? '#4ade80' : isCurrent ? '#3078ff' : 'rgba(255,255,255,0.25)';
              return (
                <div style={{
                  padding: '20px 24px', borderRadius: 16,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${accentColor}40`,
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ padding: '3px 10px', borderRadius: 6, background: `${accentColor}20`, border: `1px solid ${accentColor}40` }}>
                        <span style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, fontWeight: 700, color: accentColor }}>{r.q} · {r.done ? 'Completado' : isCurrent ? 'En curso' : 'Pendiente'}</span>
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>{r.label}</div>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.6 }}>{r.detail}</div>

                    {/* Claim reward */}
                    {r.claim > 0 && (
                      <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12, background: claimed[active] ? 'rgba(74,222,128,0.08)' : 'rgba(48,120,255,0.1)', border: `1px solid ${claimed[active] ? 'rgba(74,222,128,0.25)' : 'rgba(48,120,255,0.25)'}` }}>
                        <span style={{ fontSize: 20 }}>💰</span>
                        <div>
                          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 16, color: claimed[active] ? '#4ade80' : 'var(--text)' }}>
                            {claimed[active] ? '¡Cobrado!' : `$${r.claim.toFixed(2)} USDC`}
                          </div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)' }}>{r.claimLabel}</div>
                        </div>
                        {!claimed[active] && (
                          <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setClaimed(c => ({ ...c, [active]: true }))}
                            style={{ marginLeft: 8, padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: '#3078ff', color: '#fff', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 12 }}
                          >Cobrar →</motion.button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Airdrop box */}
                  {r.airdrop && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 160 }}>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 10, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Airdrop de fase</div>
                      <AirdropBox
                        tokens={r.airdrop.tokens}
                        symbol={r.airdrop.symbol}
                        claimed={r.airdrop.claimed}
                        future={r.airdrop.future}
                        onClaim={() => {}}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ROADMAP = [
  { q: 'Q4 2025', label: 'Seed Round',    done: true,  desc: 'Financiación inicial completada.', detail: 'Ronda seed cerrada con inversores estratégicos. Capital utilizado para desarrollo core y auditorías de smart contracts.', claim: 120.50, claimLabel: 'USDC de rendimiento', airdrop: { tokens: 500, symbol: 'KYCN', claimed: true } },
  { q: 'Q1 2026', label: 'Ronda Privada', done: true,  desc: 'Emisión privada · $3M captados.', detail: 'Ronda privada oversubscribed en 2x. Se incorporaron 14 inversores institucionales de LATAM y España.', claim: 280.00, claimLabel: 'USDC pendiente de cobrar', airdrop: { tokens: 1200, symbol: 'KYCN', claimed: false } },
  { q: 'Q2 2026', label: 'ICO Pública',   done: true,  desc: 'Venta pública activa · $5M goal.', detail: 'Token KYCN disponible al público general. Más de 4.200 wallets participantes en la primera semana.', claim: 0, claimLabel: null, airdrop: null },
  { q: 'Q3 2026', label: 'DEX Listing',   done: false, desc: 'QuickSwap + Uniswap v3.', detail: 'Listado en los principales DEX de Polygon. Provisión de liquidez inicial de $2M. Farming incentivado con KYCN.', claim: 0, claimLabel: null, airdrop: { tokens: 800, symbol: 'KYCN', claimed: false, future: true } },
  { q: 'Q4 2026', label: 'Gobernanza',    done: false, desc: 'DAO + votaciones on-chain.', detail: 'Lanzamiento del módulo de gobernanza descentralizada. Los holders de KYCN podrán votar proyectos, fees y upgrades.', claim: 0, claimLabel: null, airdrop: null },
  { q: 'Q1 2027', label: 'V2 Platform',   done: false, desc: 'Multi-chain + nuevos RWA.', detail: 'Expansión a Ethereum mainnet y Arbitrum. Incorporación de nuevas categorías de activos reales: deuda corporativa y arte.', claim: 0, claimLabel: null, airdrop: null },
];
const SHORTCUTS = [
  { label: 'Mercado\nPrimario',   route: 'primario',    icon: Icons.primary,   badge: 3, color: '#3078ff' },
  { label: 'Mercado\nSecundario', route: 'secundario',  icon: Icons.secondary, badge: 0, color: '#8247e5' },
  { label: 'Token FACT',          route: 'token',       icon: Icons.token,     badge: 0, color: '#f5a623' },
  { label: 'Mi Wallet',           route: 'pertenencias',icon: Icons.wallet,    badge: 0, color: '#2775ca' },
  { label: 'Swap',                route: 'swap',        icon: Icons.swap,      badge: 0, color: '#10b981' },
  { label: 'Academia',            route: 'academia',    icon: Icons.academy,   badge: 2, color: '#ec4899' },
];
const ALLOC_COLORS = ['var(--accent)', '#8247E5', '#2775CA', '#F5A623'];
const ACADEMY_ARTS = [
  { title: '¿Qué es RWA?',              cat: 'Tokenización', read: 8,  done: true  },
  { title: 'Cómo invertir paso a paso', cat: 'Guías',        read: 6,  done: false },
  { title: 'Vesting y cliffs',           cat: 'DeFi',         read: 7,  done: false },
  { title: 'Gobernanza on-chain',        cat: 'DeFi',         read: 5,  done: false },
  { title: 'Pools de liquidez',          cat: 'DeFi',         read: 9,  done: false },
];
const ACAD_CATS = ['Todos', 'Tokenización', 'Guías', 'DeFi'];

// Animated counter hook
function useCounter(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

// Countdown to Jul 1
function useCountdown(target) {
  const [rem, setRem] = useState(0);
  useEffect(() => {
    const tick = () => setRem(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  const s = Math.floor(rem / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

// Ripple on click
function useRipple() {
  const [ripples, setRipples] = useState([]);
  const spawn = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples(r => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(r => r.filter(x => x.id !== id)), 600);
  }, []);
  return [ripples, spawn];
}

// Flip digit
function Flip({ val }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', minWidth: '1.2ch' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={val}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          style={{ display: 'inline-block' }}
        >
          {String(val).padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export default function Dashboard({ nav }) {
  const [period, setPeriod] = useState('12M');
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [expandedHolding, setExpandedHolding] = useState(null);
  const [allocView, setAllocView] = useState('total');
  const [allocHover, setAllocHover] = useState(null);
  const [acadCat, setAcadCat] = useState('Todos');
  const [readDone, setReadDone] = useState({ 0: true });
  const [kpiFlip, setKpiFlip] = useState({});
  const [shortRipples, spawnRipple] = useRipple();
  const [lineProgress, setLineProgress] = useState(0);

  const { holdTotal, investedTotal, yieldTotal, cashTotal } = useMemo(() => ({
    holdTotal:     MY_HOLDINGS.reduce((s, h) => s + h.current, 0),
    investedTotal: MY_HOLDINGS.reduce((s, h) => s + h.invested, 0),
    yieldTotal:    MY_HOLDINGS.reduce((s, h) => s + h.yieldEarned, 0),
    cashTotal:     MY_BALANCES.reduce((s, b) => s + b.usd, 0),
  }), []);

  const perfData = useMemo(() => {
    const T = holdTotal + cashTotal;
    return {
      '3M':  { pts: [T*0.912,T*0.934,T*0.947,T*0.958,T*0.951,T*0.962,T*0.971,T*0.982,T*0.978,T*0.989,T*0.994,T], labels: ['Mar','Abr','May','Jun'], start: T*0.912 },
      '6M':  { pts: [T*0.823,T*0.841,T*0.858,T*0.876,T*0.889,T*0.901,T*0.912,T*0.934,T*0.947,T*0.962,T*0.982,T], labels: ['Ene','Feb','Mar','Abr','May','Jun'], start: T*0.823 },
      '12M': { pts: [T*0.681,T*0.704,T*0.723,T*0.718,T*0.747,T*0.771,T*0.793,T*0.812,T*0.836,T*0.865,T*0.901,T], labels: ['Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb','Mar','Abr','May','Jun'], start: T*0.681 },
    };
  }, [holdTotal, cashTotal]);

  const { allocRWA, allocTotal, grandTotal } = useMemo(() => {
    const walletTotal = MY_BALANCES.reduce((s, b) => s + b.usd, 0);
    const grand = holdTotal + walletTotal;

    // RWA by category
    const catColors = { Campos: '#4ade80', Autos: '#3078ff', Drones: '#f5a623', Edificios: '#8247E5', Inmuebles: '#2775CA' };
    const byCat = {};
    MY_HOLDINGS.forEach(h => {
      const a = RWA_ASSETS.find(x => x.id === h.assetId);
      if (!a) return;
      if (!byCat[a.cat]) byCat[a.cat] = { val: 0, apySum: 0, count: 0 };
      byCat[a.cat].val += h.current;
      byCat[a.cat].apySum += a.apy;
      byCat[a.cat].count += 1;
    });
    const allocRWA = Object.entries(byCat).map(([cat, d]) => ({
      label: cat,
      value: Math.round(d.val / holdTotal * 100),
      amount: d.val,
      color: catColors[cat] || '#aaa',
      sub: `APY prom. ${(d.apySum / d.count).toFixed(1)}%`,
    }));

    // Full portfolio breakdown
    const kycn = MY_BALANCES.find(b => b.sym === 'FACT') || { usd: 0, qty: 0 };
    const usdc = MY_BALANCES.find(b => b.sym === 'USDC') || { usd: 0 };
    const cryptoAmt = MY_BALANCES.filter(b => b.sym !== 'FACT' && b.sym !== 'USDC').reduce((s, b) => s + b.usd, 0);
    const allocTotal = [
      { label: 'RWA Activos',   value: Math.round(holdTotal / grand * 100),  amount: holdTotal,  color: '#3078ff', sub: `${MY_HOLDINGS.length} proyectos activos` },
      { label: 'USDC Líquido',  value: Math.round(usdc.usd / grand * 100),   amount: usdc.usd,   color: '#2775CA', sub: 'Disponible para invertir' },
      { label: 'Token KYCN',    value: Math.round(kycn.usd / grand * 100),   amount: kycn.usd,   color: '#f5a623', sub: `${kycn.qty.toLocaleString()} tokens` },
      { label: 'Crypto',        value: Math.round(cryptoAmt / grand * 100),  amount: cryptoAmt,  color: '#8247E5', sub: 'MATIC + ETH' },
    ];
    return { allocRWA, allocTotal, grandTotal: grand };
  }, [holdTotal]);

  // KPI views: value | change | detail
  const kpis = useMemo(() => [
    {
      k: 'Patrimonio total', icon: Icons.wallet,
      views: [
        { v: fmtUSD2(holdTotal + cashTotal), sub: '+8.4% este mes', pos: true },
        { v: '+8.4%', sub: `vs mes anterior`, pos: true },
        { v: fmtUSD2(cashTotal), sub: 'en efectivo disponible', pos: null },
      ],
    },
    {
      k: 'Invertido en RWA', icon: Icons.primary,
      views: [
        { v: fmtUSD2(holdTotal), sub: `${MY_HOLDINGS.length} proyectos`, pos: null },
        { v: `${MY_HOLDINGS.length}`, sub: 'activos en portafolio', pos: null },
        { v: fmtUSD2(holdTotal / MY_HOLDINGS.length), sub: 'promedio por activo', pos: null },
      ],
    },
    {
      k: 'Yield cobrado', icon: Icons.receive,
      views: [
        { v: fmtUSD2(yieldTotal), sub: 'desde Mar 2025', pos: true },
        { v: `${((yieldTotal / investedTotal) * 100).toFixed(1)}%`, sub: 'retorno sobre capital', pos: true },
        { v: fmtUSD2(yieldTotal / 15), sub: 'promedio mensual', pos: true },
      ],
    },
    {
      k: 'P&L no realizado', icon: Icons.dash,
      views: [
        { v: `+${(((holdTotal / investedTotal) - 1) * 100).toFixed(1)}%`, sub: fmtUSD2(holdTotal - investedTotal), pos: true },
        { v: fmtUSD2(holdTotal - investedTotal), sub: 'ganancia no realizada', pos: true },
        { v: fmtUSD2(investedTotal), sub: 'capital invertido inicial', pos: null },
      ],
    },
  ], [holdTotal, cashTotal, yieldTotal, investedTotal]);

  // Countdown to Jul 1 2026
  const targetDate = useMemo(() => new Date('2026-07-01T00:00:00').getTime(), []);
  const countdown = useCountdown(targetDate);

  // Animated counter for big number
  const totalAnimated = useCounter(Math.round(holdTotal + cashTotal));

  // Roadmap line progress animation on mount
  useEffect(() => {
    const t = setTimeout(() => setLineProgress(1), 400);
    return () => clearTimeout(t);
  }, []);

  const filteredArts = acadCat === 'Todos' ? ACADEMY_ARTS : ACADEMY_ARTS.filter(a => a.cat === acadCat);

  return (
    <>
    <div className="g-page" style={{ padding: '28px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <motion.div
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 24, color: 'var(--text)', letterSpacing: '-0.02em' }}
          >
            Hola, Max 👋
          </motion.div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', marginTop: 3 }}>
            Resumen de tu posición al 13 de junio de 2026.
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => setAdvisorOpen(true)}
          style={{
            padding: '11px 22px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: 'var(--accent-fg)',
            fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 13.5,
            boxShadow: '0 0 20px rgba(48,120,255,0.35)',
          }}
        >
          + Nueva inversión
        </motion.button>
      </div>

      {/* KPI cards — click to cycle views */}
      <div className="g-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {kpis.map(({ k, icon, views }, idx) => {
          const vi = kpiFlip[idx] || 0;
          const { v, sub, pos } = views[vi];
          return (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              whileHover={{ y: -2 }}
              onClick={() => setKpiFlip(f => ({ ...f, [idx]: ((f[idx] || 0) + 1) % views.length }))}
              className="glow-card glass-card"
              style={{ padding: '18px 22px', borderRadius: 20, cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{k}</div>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--gl-icon)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gl-icon-c)', border: '1px solid var(--gl-ibd)', flexShrink: 0 }}>{icon}</div>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${idx}-${vi}`}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className={idx === 0 && vi === 0 ? 'glow-text' : ''} style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: idx === 0 && vi === 0 ? undefined : pos === true ? 'var(--pos)' : pos === false ? 'var(--neg)' : 'var(--text)', letterSpacing: '-0.03em' }}>
                    {idx === 0 && vi === 0 ? `$${totalAnimated.toLocaleString()}` : v}
                  </div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 4 }}>{sub}</div>
                </motion.div>
              </AnimatePresence>
              {/* Dot indicator */}
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {views.map((_, i) => (
                  <div key={i} style={{ width: i === vi ? 12 : 4, height: 4, borderRadius: 2, background: i === vi ? 'var(--accent)' : 'var(--gl-div)', transition: 'all 0.2s' }} />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Fila 2: Portafolio total + Próxima distribución */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: 16, marginBottom: 16 }}>

        {/* Portafolio total — with chart */}
        <div className="glow-card glass-card" style={{ padding: '20px 22px', borderRadius: 20, marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 4 }}>Portafolio total</div>
              <div className="glow-text" style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 30, letterSpacing: '-0.04em' }}>
                ${totalAnimated.toLocaleString()}
              </div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: '#4ade80', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                +8.4% este mes
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['3M', '6M', '12M'].map(p => (
                <motion.button key={p} onClick={() => setPeriod(p)}
                  whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                  style={{
                    padding: '5px 10px', borderRadius: 999, border: 'none',
                    background: period === p ? 'var(--gl-prd-a)' : 'var(--gl-prd-i)',
                    color: period === p ? 'var(--gl-prd-ca)' : 'var(--gl-prd-ci)',
                    fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  }}>{p}</motion.button>
              ))}
            </div>
          </div>
          <PortfolioChart data={perfData[period]} period={period} />
        </div>

        {/* Próxima distribución — live countdown */}
        <div className="glow-card glass-card" style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', borderRadius: 20 }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>Próxima distribución</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginBottom: 14 }}>01 Jul 2026</div>

          {/* Countdown grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
            {[['d', countdown.d], ['h', countdown.h], ['m', countdown.m], ['s', countdown.s]].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 4px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--gl-div)' }}>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, color: 'var(--text)', lineHeight: 1 }}>
                  <Flip val={val} />
                </div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 9.5, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, background: 'var(--gl-div)', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: '50%' }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
              style={{ height: '100%', background: 'var(--accent)', borderRadius: 2 }}
            />
          </div>

          <div style={{ marginTop: 'auto', padding: '12px 14px', background: 'var(--gl-bg4)', borderRadius: 12, border: '1px solid var(--gl-bd)' }}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', marginBottom: 2 }}>Estimado</div>
            <div className="glow-text" style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 20 }}>$1,278.00</div>
          </div>
        </div>
      </div>

      {/* Fila 3: Mis inversiones + Diversificación + Academia */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Mis inversiones */}
        <div className="glow-card glass-card" style={{ padding: '20px 22px', borderRadius: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Mis inversiones</div>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => nav('pertenencias')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--gl-link)', fontWeight: 600 }}>Ver todo →</motion.button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {MY_HOLDINGS.slice(0, 2).map((h, i) => {
              const a = RWA_ASSETS.find(x => x.id === h.assetId);
              const pnl = ((h.current / h.invested - 1) * 100).toFixed(1);
              const isPos = h.current >= h.invested;
              return (
                <div key={i} style={{ borderBottom: i < 1 ? '1px solid var(--gl-div)' : 'none', padding: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={a.img} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{a.name}</div>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'var(--ter)', marginTop: 2 }}>{h.tokens} tokens</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>{fmtUSD2(h.current)}</div>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: isPos ? 'var(--pos)' : 'var(--neg)', marginTop: 1 }}>{isPos ? '+' : ''}{pnl}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diversificación */}
        <div className="glow-card glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Diversificación</div>
            <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
              {[['RWA', 'rwa'], ['Total', 'total']].map(([lbl, key]) => (
                <motion.button key={key} onClick={() => { setAllocView(key); setAllocHover(null); }}
                  whileTap={{ scale: 0.94 }}
                  style={{ padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 10.5, fontWeight: 700,
                    background: allocView === key ? 'rgba(255,255,255,0.13)' : 'transparent',
                    color: allocView === key ? 'var(--text)' : 'var(--ter)', transition: 'all 0.15s',
                  }}>{lbl}</motion.button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <PDonut segments={allocView === 'rwa' ? allocRWA : allocTotal} size={88} label={`$${(allocView === 'rwa' ? holdTotal : grandTotal).toLocaleString()}`} sub={allocView === 'rwa' ? 'en RWA' : 'total'} />
          </div>
        </div>

        {/* Academia */}
        <div className="glow-card glass-card" style={{ padding: '20px 22px', borderRadius: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Academia</div>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => nav('academia')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--gl-link)', fontWeight: 600 }}>Ver todo →</motion.button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filteredArts.slice(0, 3).map((art, i) => (
              <div key={art.title} style={{ padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--gl-div)' : 'none', cursor: 'pointer' }} onClick={() => nav('articulo')}>
                <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 11.5, color: readDone[art.title] ? 'var(--ter)' : 'var(--text)', textDecoration: readDone[art.title] ? 'line-through' : 'none' }}>{art.title}</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ padding: '1px 5px', borderRadius: 3, background: 'rgba(48,120,255,0.15)', fontFamily: 'var(--font-b)', fontSize: 8.5, color: 'rgba(80,150,255,0.9)', fontWeight: 600 }}>{art.cat}</span>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 9.5, color: 'var(--ter)' }}>{art.read} min</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fila 4: Roadmap KYCN + Gráfico histórico KYCN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <RoadmapKYCN />

        {/* Historical KYCN chart */}
        <div className="glow-card glass-card" style={{ padding: '20px 22px', borderRadius: 20 }}>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 12 }}>Token KYCN - Histórico</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <div className="glow-text" style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em' }}>$2.45</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: '#4ade80', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                +12.8% año
              </div>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {['1M', '3M', '1Y'].map(p => (
                <motion.button key={p}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '5px 9px', borderRadius: 6, border: 'none',
                    background: 'rgba(48,120,255,0.85)',
                    color: '#fff',
                    fontFamily: 'var(--font-b)', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  }}>{p}</motion.button>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 280 60" width="100%" height="60" preserveAspectRatio="none" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="kycn-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3078ff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3078ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline points="0,45 14,40 28,38 42,42 56,35 70,32 84,36 98,28 112,25 126,30 140,20 154,18 168,22 182,15 196,12 210,18 224,10 238,8 252,12 266,6 280,8"
              fill="none" stroke="#3078ff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <polygon points="0,45 14,40 28,38 42,42 56,35 70,32 84,36 98,28 112,25 126,30 140,20 154,18 168,22 182,15 196,12 210,18 224,10 238,8 252,12 266,6 280,8 280,60 0,60"
              fill="url(#kycn-grad)" />
          </svg>
        </div>
      </div>
    </div>

    <AnimatePresence>
      {advisorOpen && (
        <InvestAdvisor onClose={() => setAdvisorOpen(false)} nav={nav} />
      )}
    </AnimatePresence>
    </>
  );
}
