import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { PLogo, PTag, PImg, Icons } from '../components/ui';
import StrategySimulator from '../components/StrategySimulator';
import { RWA_ASSETS, FACT_TOKEN } from '../data';
import { DEV_LOGIN_ENABLED } from '../lib/devSession';

const STATS = [
  { v: '$28.4M', l: 'Capital invertido' },
  { v: '148',    l: 'Proyectos activos'  },
  { v: '12,840', l: 'Inversores'         },
  { v: '9.8%',   l: 'APY promedio'       },
];

const HOW = [
  { n: '01', t: 'Verificá tu identidad', d: 'Completá el KYC en menos de 5 minutos. Solo DNI y selfie.' },
  { n: '02', t: 'Elegí tu activo',       d: 'Explorá drones, campos, autos premium, edificios tokenizados.' },
  { n: '03', t: 'Invertí en tokens',     d: 'Comprá fracciones desde tu wallet. Desde $38 USD.' },
  { n: '04', t: 'Cobrá rendimientos',    d: 'Distribuciones mensuales en USDC directo a tu wallet.' },
];

const FEATURES = [
  { icon: Icons.shield, t: 'Contratos auditados',    d: 'ERC-20 auditados por CertiK antes de cada emisión en Polygon.' },
  { icon: Icons.wallet, t: 'Custodia institucional', d: 'Activos físicos con custodia profesional y póliza de seguro.' },
  { icon: Icons.token,  t: 'Liquidez secundaria',    d: 'Vendé tus tokens en cualquier momento en el Mercado P2P.' },
  { icon: Icons.swap,   t: 'Rendimientos en USDC',   d: 'Distribuciones on-chain mensuales. Sin bancos ni intermediarios.' },
];

/* Liquid Glass object — inline style shorthand */
const LG = {
  background: 'rgba(255,255,255,0.045)',
  backdropFilter: 'blur(32px) saturate(160%)',
  WebkitBackdropFilter: 'blur(32px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 20,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.13), 0 20px 60px rgba(0,0,0,0.70)',
  overflow: 'hidden',
};

const LG_SM = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
};

// "Entrar dev" — skips the wallet login (see lib/devSession). Dashed amber so
// it never gets mistaken for the real "Iniciar sesión" button.
const DEV_BTN = {
  padding: '6px 14px', fontSize: 13, fontFamily: 'var(--font-b)',
  fontWeight: 700, borderRadius: 10, cursor: 'pointer', height: 36,
  background: 'rgba(255,184,0,0.10)', color: '#ffc94d',
  border: '1px dashed rgba(255,184,0,0.55)',
};


export default function Landing({ onEnter, onDevEnter }) {
  const featured  = RWA_ASSETS.slice(0, 3);
  const spotRef   = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Parallax mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  // Coins move with mouse (same direction, subtle)
  const coinsX = useTransform(springX, [-1, 1], [-18, 18]);
  const coinsY = useTransform(springY, [-1, 1], [-10, 10]);

  // Image moves inverted (opposite direction, more pronounced)
  const imgX = useTransform(springX, [-1, 1], [22, -22]);
  const imgY = useTransform(springY, [-1, 1], [14, -14]);

  // Cierra el menu si se pasa a desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth > 767) setMenuOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Gyroscope parallax for mobile
  useEffect(() => {
    if (!isMobile) return;
    const handler = (e) => {
      const gamma = Math.max(-30, Math.min(30, e.gamma || 0)); // left-right tilt
      const beta  = Math.max(-20, Math.min(20, (e.beta || 0) - 45)); // front-back tilt
      mouseX.set(gamma / 30);
      mouseY.set(beta  / 20);
    };
    const request = async () => {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try { await DeviceOrientationEvent.requestPermission(); } catch {}
      }
      window.addEventListener('deviceorientation', handler);
    };
    request();
    return () => window.removeEventListener('deviceorientation', handler);
  }, [isMobile, mouseX, mouseY]);

  const onMouseMove = useCallback((e) => {
    if (spotRef.current) {
      spotRef.current.style.background =
        `radial-gradient(600px circle at ${e.clientX}px ${e.clientY}px, rgba(255,255,255,0.025), transparent 65%)`;
    }
    if (!isMobile) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(nx);
      mouseY.set(ny);
    }
  }, [isMobile, mouseX, mouseY]);

  return (
    <div onMouseMove={onMouseMove} style={{ minHeight: '100vh', background: 'transparent', overflowX: 'hidden', position: 'relative', paddingTop: 64 }}>

      {/* Layer 1: cursor spotlight */}
      <div ref={spotRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      {/* Dot glow on cursor */}
      <div className="dot-cursor-glow" />

      {/* Menu blur overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 48, backdropFilter: 'blur(12px) brightness(0.55)', WebkitBackdropFilter: 'blur(12px) brightness(0.55)', pointerEvents: 'auto' }}
          />
        )}
      </AnimatePresence>

      {/* Layer 2: monochromatic ambient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '0%',  width: 750, height: 750, borderRadius: '50%', background: 'radial-gradient(circle, rgba(80,80,80,0.11) 0%, transparent 70%)', filter: 'blur(110px)', animation: 'float-slow 12s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '0%',  right: '-5%', width: 650, height: 650, borderRadius: '50%', background: 'radial-gradient(circle, rgba(55,55,55,0.09) 0%, transparent 70%)', filter: 'blur(90px)',  animation: 'float-slow 16s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', top: '38%',  right: '28%',  width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,100,100,0.06) 0%, transparent 70%)', filter: 'blur(70px)',  animation: 'float-slow 20s ease-in-out infinite' }} />
      </div>


      {/* ─── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(9,9,9,0.82)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 64,
      }} className="land-nav navbar-glow">
        <PLogo size={16} />

        {/* Desktop links */}
        <div className="land-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {['Proyectos', 'Cómo funciona', 'Academia', 'Token FACT'].map(l => (
            <span key={l}
              style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.88)'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.42)'}
            >{l}</span>
          ))}
        </div>

        {/* Desktop connect button — routes to the centralized Key Pay login
            screen instead of opening a wallet connect flow of its own, so
            there's exactly one login experience for the whole platform. */}
        <div className="connect-btn-wrap land-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {DEV_LOGIN_ENABLED && onDevEnter && (
            <button onClick={onDevEnter} title="Entrar sin wallet (solo desarrollo)" style={DEV_BTN}>Entrar dev</button>
          )}
          <button
            onClick={onEnter}
            style={{
              padding: '6px 16px', fontSize: 13, fontFamily: 'var(--font-b)',
              fontWeight: 700, borderRadius: 10, cursor: 'pointer', height: 36,
              background: 'rgba(255,255,255,0.92)', color: '#060606', border: 'none',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 4px 14px rgba(0,0,0,0.40)',
            }}
          >Iniciar sesión</button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="land-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'none', width: 38, height: 38, borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.05)',
            cursor: 'pointer', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.75)', flexShrink: 0,
          }}
        >
          {menuOpen
            ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            : <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          }
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'fixed', top: 56, left: 0, right: 0, zIndex: 49,
              background: 'rgba(9,9,9,0.96)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '20px 24px 28px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}
            className="land-mobile-menu"
          >
{['Proyectos', 'Cómo funciona', 'Academia', 'Token FACT'].map(l => (
              <button key={l} onClick={() => setMenuOpen(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--font-b)', fontSize: 16, fontWeight: 500,
                color: 'rgba(255,255,255,0.65)', padding: '12px 4px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                transition: 'color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.95)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
              >{l}</button>
            ))}
            <div style={{ marginTop: 16, width: '100%' }} className="connect-btn-wrap connect-btn-full">
              <button
                onClick={() => { setMenuOpen(false); onEnter(); }}
                style={{
                  padding: '12px 20px', fontSize: 15, fontFamily: 'var(--font-b)',
                  fontWeight: 700, borderRadius: 12, cursor: 'pointer', width: '100%',
                  background: 'rgba(255,255,255,0.92)', color: '#060606', border: 'none',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 4px 14px rgba(0,0,0,0.40)',
                }}
              >Iniciar sesión</button>
              {DEV_LOGIN_ENABLED && onDevEnter && (
                <button
                  onClick={() => { setMenuOpen(false); onDevEnter(); }}
                  style={{ ...DEV_BTN, marginTop: 10, width: '100%', height: 'auto', padding: '12px 20px', fontSize: 15, borderRadius: 12 }}
                >Entrar dev</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HERO ───────────────────────────────────────────── */}
      <section className="land-hero-section" style={{ position: 'relative', zIndex: 2, padding: '28px 48px 0', textAlign: 'center' }}>

        {/* Deep blue glow behind visual */}
        <div style={{ position: 'absolute', bottom: -60, left: '50%', transform: 'translateX(-50%)', width: 1000, height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(30,80,220,0.30) 0%, transparent 68%)', filter: 'blur(70px)', pointerEvents: 'none', zIndex: 0 }}/>

        {/* Badge row — desktop only */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="land-hero-badge"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 32, position: 'relative', zIndex: 1 }}>
          <div style={{ ...LG_SM, padding: '6px 16px', display: 'inline-flex', gap: 8, alignItems: 'center', borderRadius: 999 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.7)', display: 'inline-block', flexShrink: 0 }}/>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Activos tokenizados en Polygon</span>
          </div>
          <div onClick={onEnter} style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(30,80,220,0.28)', border: '1px solid rgba(80,140,255,0.35)', cursor: 'pointer' }}>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'rgba(140,190,255,0.95)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>EXPLORAR</span>
          </div>
        </motion.div>

        {/* H1 */}
        <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.65 }}
          className="land-hero-h1"
          style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 74, lineHeight: 1.01, letterSpacing: '-0.05em', color: 'rgba(255,255,255,0.95)', margin: '0 auto 20px', maxWidth: 900, position: 'relative', zIndex: 1 }}>
          Cociná tu fábrica<br/>
          <span style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.95) 0%,rgba(200,200,200,0.60) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>de tokenizaciones.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}
          className="land-hero-sub"
          style={{ fontFamily: 'var(--font-b)', fontSize: 17, color: 'rgba(255,255,255,0.36)', lineHeight: 1.65, maxWidth: 520, margin: '0 auto 36px', position: 'relative', zIndex: 1 }}>
          Autos, campos, drones, inmuebles y edificios tokenizados — desde cualquier monto, con rendimientos mensuales en USDC.
        </motion.p>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
          className="land-hero-ctas"
          style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 8, position: 'relative', zIndex: 1 }}>
          <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} onClick={onEnter}
            className="land-cta-primary"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 30px', fontSize: 15, fontFamily: 'var(--font-b)', fontWeight: 700, borderRadius: 40, cursor: 'pointer', background: 'rgba(255,255,255,0.95)', color: '#060606', border: 'none', boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 8px 32px rgba(0,0,0,0.50)', transition: 'all 0.2s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Empezar ahora
          </motion.button>
        </motion.div>

        {/* ── Visual: 3ds.png con monedas flotantes ── */}
        <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58, duration: 0.8 }}
          className="land-hero-visual"
          style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', minHeight: 340 }}>

          {/* Horizontal light streak */}
          <div style={{ position: 'absolute', top: '45%', left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(60,120,255,0.30), rgba(80,150,255,0.55), rgba(60,120,255,0.30), transparent)', filter: 'blur(1px)', pointerEvents: 'none' }}/>

          {/* Coins — left */}
          {[
            // size: desktop size | msize: mobile size | mz: mobile z-index (4=front, 1=back) | mop: mobile opacity for depth
            { id: 'ETH',  color: '#627EEA', bg: 'rgba(98,126,234,0.12)',  x: -230, y: 110, mx: -122, my: 55,  size: 64, msize: 50, dur: 3.2, mz: 4, mop: 1.0,   src: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/eth.svg' },
            { id: 'BTC',  color: '#F7931A', bg: 'rgba(247,147,26,0.10)',  x: -390, y: 60,  mx: -152, my: 195, size: 44, msize: 28, dur: 2.8, mz: 1, mop: 0.45,  src: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/btc.svg' },
            { id: 'USDT', color: '#26A17B', bg: 'rgba(38,161,123,0.10)',  x: -310, y: 205, mx: -90,  my: 268, size: 52, msize: 40, dur: 3.6, mz: 3, mop: 0.85,  src: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/usdt.svg' },
            { id: 'SOL',  color: '#9945FF', bg: 'rgba(153,69,255,0.10)',  x: -165, y: 200, mx: -148, my: 310, size: 36, msize: 22, dur: 2.5, mz: 1, mop: 0.35,  src: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png' },
          ].map((c, i) => {
            const cx = isMobile ? c.mx : c.x;
            const cy = isMobile ? c.my : c.y;
            const cs = isMobile ? c.msize : c.size;
            const cz = isMobile ? c.mz : 3;
            const cop = isMobile ? c.mop : 1;
            return (
            <motion.div key={c.id}
              initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: cop, scale: 1 }} transition={{ delay: 0.72 + i * 0.10, duration: 0.45 }}
              style={{ position: 'absolute', left: `calc(50% + ${cx}px)`, bottom: cy, x: coinsX, y: coinsY, transform: 'translateX(-50%)', zIndex: cz }}>
              <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: c.dur, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: cs, height: cs, borderRadius: '50%', background: c.bg, border: `1.5px solid ${c.color}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: `0 4px 28px ${c.color}28, inset 0 1px 0 rgba(255,255,255,0.18)` }}>
                <img src={c.src} alt={c.id} style={{ width: '60%', height: '60%', objectFit: 'contain' }} />
              </motion.div>
            </motion.div>
          );})}

          {/* Coins — right */}
          {[
            { id: 'POL',  color: '#8247E5', bg: 'rgba(130,71,229,0.12)', x: 230,  y: 110, mx: 122, my: 55,  size: 58, msize: 46, dur: 3.0, mz: 4, mop: 1.0,   src: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/matic.svg' },
            { id: 'USDC', color: '#2775CA', bg: 'rgba(39,117,202,0.10)', x: 390,  y: 55,  mx: 150,  my: 195, size: 40, msize: 26, dur: 2.6, mz: 1, mop: 0.40,  src: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/usdc.svg' },
            { id: 'BNB',  color: '#F3BA2F', bg: 'rgba(243,186,47,0.10)', x: 310,  y: 205, mx: 90,   my: 268, size: 70, msize: 42, dur: 3.4, mz: 3, mop: 0.90,  src: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/bnb.svg' },
            { id: 'SOL2', color: '#9945FF', bg: 'rgba(153,69,255,0.10)', x: 165,  y: 200, mx: 148,  my: 310, size: 32, msize: 20, dur: 2.9, mz: 1, mop: 0.35,  src: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png' },
          ].map((c, i) => {
            const cx = isMobile ? c.mx : c.x;
            const cy = isMobile ? c.my : c.y;
            const cs = isMobile ? c.msize : c.size;
            const cz = isMobile ? c.mz : 3;
            const cop = isMobile ? c.mop : 1;
            return (
            <motion.div key={c.id}
              initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: cop, scale: 1 }} transition={{ delay: 0.75 + i * 0.10, duration: 0.45 }}
              style={{ position: 'absolute', left: `calc(50% + ${cx}px)`, bottom: cy, x: coinsX, y: coinsY, transform: 'translateX(-50%)', zIndex: cz }}>
              <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: c.dur, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: cs, height: cs, borderRadius: '50%', background: c.bg, border: `1.5px solid ${c.color}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: `0 4px 28px ${c.color}28, inset 0 1px 0 rgba(255,255,255,0.18)` }}>
                <img src={c.src} alt={c.id} style={{ width: '60%', height: '60%', objectFit: 'contain' }} />
              </motion.div>
            </motion.div>
          );})}


          {/* Center 3ds.png */}
          <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
            {/* Outer glow ring */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-52%)', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(30,90,230,0.32) 0%, transparent 68%)', filter: 'blur(36px)', pointerEvents: 'none' }}/>
            {/* Inner glow ring */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-52%)', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(60,130,255,0.26) 0%, transparent 70%)', filter: 'blur(18px)', pointerEvents: 'none' }}/>
            <motion.img src="/3ds.png" alt="Factoract"
              animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 300, height: 'auto', display: 'block', position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 48px rgba(40,100,255,0.65)) drop-shadow(0 24px 64px rgba(0,0,0,0.95))', x: imgX, y: imgY }}/>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
          style={{ display: 'flex', justifyContent: 'center', gap: 56, padding: '36px 0 52px', marginTop: 36, position: 'relative', zIndex: 1 }} className="land-hero-stats">
          {STATS.map((s, i) => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.95)' }}>{s.v}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ─── DOS FORMAS ─────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 88px', position: 'relative', zIndex: 2 }} className="land-section">
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12, fontWeight: 700 }}>Dos formas de invertir</div>
          <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 42, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Invertí en proyectos o<br />en la empresa misma
          </h2>
          <p style={{ fontFamily: 'var(--font-b)', fontSize: 16, color: 'rgba(255,255,255,0.35)', marginTop: 14, lineHeight: 1.65 }}>
            Elegí entre activos tokenizados del mundo real o el token FACT.
          </p>
        </div>

        <div className="land-invest-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Card RWA */}
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="glow-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', ...LG }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <PTag label="Proyectos RWA" color="neutral" style={{ marginBottom: 12 }} />
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Activos del<br />mundo real</div>
              </div>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.65)', flexShrink: 0, border: '1px solid rgba(255,255,255,0.10)' }}>
                {Icons.primary}
              </div>
            </div>
            <p style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, marginBottom: 24 }}>
              Invertí en fracciones de autos, campos, drones, inmuebles y edificios tokenizados en Polygon. Cada token representa participación proporcional del activo.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[['Desde', '$38 USD'], ['APY promedio', '9.8%'], ['Distribución', 'Mensual USDC'], ['Proyectos activos', '148']].map(([l, v]) => (
                <div key={l} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.90)' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28, flex: 1 }}>
              {['Rendimientos fijos mensuales on-chain', 'Liquidez en mercado secundario P2P', 'Contratos auditados · Seguro incluido', 'Sin bancos ni intermediarios'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="var(--pos)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'rgba(255,255,255,0.50)' }}>{f}</span>
                </div>
              ))}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onEnter}
              style={{ width: '100%', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, border: '1px solid rgba(255,255,255,0.13)', cursor: 'pointer', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
            >
              Explorar proyectos →
            </motion.button>
          </motion.div>

          {/* Card FACT */}
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="glow-card"
            style={{ padding: 32, display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden', position: 'relative',
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(32px) saturate(160%)', WebkitBackdropFilter: 'blur(32px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.13)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 24px 72px rgba(0,0,0,0.75)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', marginBottom: 12, border: '1px solid rgba(255,255,255,0.12)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pos)', display: 'inline-block', boxShadow: '0 0 8px rgba(74,222,128,0.7)' }} />
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'rgba(255,255,255,0.60)', fontWeight: 700 }}>ICO Activa · Ronda Pública</span>
                </div>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  Token FACT<br />— la empresa
                </div>
              </div>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.65)', flexShrink: 0, border: '1px solid rgba(255,255,255,0.10)' }}>
                {Icons.token}
              </div>
            </div>
            <p style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, marginBottom: 24 }}>
              FACT es el token de utilidad de FACTORACT. Al invertir en la ICO participás del crecimiento de la plataforma: descuentos en fees, gobernanza DAO y staking.
            </p>
            {/* Progress */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.32)' }}>Recaudado</span>
                <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                  ${(FACT_TOKEN.raised / 1e6).toFixed(2)}M / ${(FACT_TOKEN.goal / 1e6).toFixed(1)}M
                </span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} whileInView={{ width: `${(FACT_TOKEN.raised / FACT_TOKEN.goal) * 100}%` }}
                  viewport={{ once: true }} transition={{ duration: 1.4, ease: 'easeOut' }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, rgba(255,255,255,0.45), rgba(255,255,255,0.85))', borderRadius: 999, boxShadow: '0 0 8px rgba(255,255,255,0.25)' }}
                />
              </div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>
                {Math.round((FACT_TOKEN.raised / FACT_TOKEN.goal) * 100)}% completado · {FACT_TOKEN.holders.toLocaleString()} holders
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[['Precio ICO', `$${FACT_TOKEN.price}`], ['Staking APY', '9–14%'], ['TGE', '15% inmediato'], ['Vesting', '12 meses']].map(([l, v]) => (
                <div key={l} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.90)' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28, flex: 1 }}>
              {['50% de descuento en fees de plataforma', 'Gobernanza DAO · Votás los proyectos', 'Staking con APY 9–14% anual', 'Acceso anticipado a proyectos nuevos'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="var(--pos)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'rgba(255,255,255,0.50)' }}>{f}</span>
                </div>
              ))}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onEnter}
              style={{ width: '100%', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.92)', color: '#060606', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 4px 16px rgba(0,0,0,0.40)' }}
            >
              Participar en la ICO →
            </motion.button>
          </motion.div>

        </div>
      </section>

      {/* ─── FEATURES ───────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 48px' }} className="land-section">
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12, fontWeight: 700 }}>Por qué KEY CHAIN</div>
            <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              Seguridad y transparencia,<br />sin compromiso
            </h2>
          </div>
          <div className="land-feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.09 }}
                className="glow-card" style={{ padding: '24px 22px', ...LG }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.65)', marginBottom: 16, border: '1px solid rgba(255,255,255,0.09)' }}>
                  {f.icon}
                </div>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.90)', marginBottom: 8 }}>{f.t}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55 }}>{f.d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 48px', position: 'relative', zIndex: 2 }} className="land-section">
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12, fontWeight: 700 }}>Cómo funciona</div>
          <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 42, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.04em' }}>Empezá en 4 pasos</h2>
        </div>
        <div className="land-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, position: 'relative' }}>
          <div className="land-steps-line" style={{ position: 'absolute', top: 27, left: '12%', right: '12%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)', zIndex: 0 }} />
          {HOW.map((h, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
              style={{ padding: '0 20px', textAlign: 'center', position: 'relative', zIndex: 1 }}
            >
              <div style={{ width: 54, height: 54, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.16)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 24px rgba(0,0,0,0.45)',
              }}>
                <span style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 14, color: 'rgba(255,255,255,0.82)' }}>{h.n}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15.5, color: 'rgba(255,255,255,0.88)', marginBottom: 10 }}>{h.t}</div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>{h.d}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── ASSET SHOWCASE ─────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 48px' }} className="land-section">
          <div className="g-section-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10, fontWeight: 700 }}>Proyectos destacados</div>
              <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 36, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.04em' }}>Activos disponibles</h2>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} onClick={onEnter}
              style={{ padding: '10px 20px', fontSize: 13.5, fontFamily: 'var(--font-b)', fontWeight: 600, borderRadius: 11, cursor: 'pointer', color: 'rgba(255,255,255,0.60)', ...LG_SM }}
            >
              Ver todos los proyectos →
            </motion.button>
          </div>
          <div className="land-asset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
            {RWA_ASSETS.slice(0, 4).map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }} onClick={onEnter} className="glow-card"
                style={{ cursor: 'pointer', ...LG }}
              >
                <PImg src={a.img} height={148} />
                <div style={{ padding: '14px 16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <PTag label={a.cat} color="neutral" />
                    <PTag label={`${a.apy}% APY`} color="green" />
                  </div>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.90)', marginBottom: 4, lineHeight: 1.3 }}>{a.name}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.32)' }}>{a.location}</div>
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginBottom: 2 }}>Token</div>
                      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.90)' }}>${a.price}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'rgba(255,255,255,0.28)', marginBottom: 2 }}>Financiado</div>
                      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--pos)' }}>{a.funded}%</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STRATEGY SIMULATOR ─────────────────────────────── */}
      <StrategySimulator />

      {/* ─── CTA ────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 2, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(90,90,90,0.07) 0%, transparent 70%)', filter: 'blur(90px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '96px 48px', textAlign: 'center' }} className="land-cta-section">
          <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 50, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.045em', lineHeight: 1.07, marginBottom: 18 }}>
              Tu capital, trabajando<br />
              <span style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(170,170,170,0.60) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                sin intermediarios.
              </span>
            </h2>
            <p style={{ fontFamily: 'var(--font-b)', fontSize: 16, color: 'rgba(255,255,255,0.32)', lineHeight: 1.65, maxWidth: 520, margin: '0 auto 40px' }}>
              Uníte a miles de inversores que ya generan rendimientos reales en USDC, con plena transparencia on-chain.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} onClick={onEnter}
                style={{ padding: '16px 40px', fontSize: 16, fontFamily: 'var(--font-b)', fontWeight: 700, borderRadius: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.92)', color: '#060606', border: 'none', boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 10px 36px rgba(0,0,0,0.55)', transition: 'all 0.25s ease-out' }}
              >
                Comenzar ahora →
              </motion.button>
            </div>
            <div style={{ marginTop: 36, display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Regulado', 'Contratos auditados CertiK', 'Custodia institucional', 'KYC verificado'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="var(--pos)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer style={{ padding: '28px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 2 }} className="land-nav">
        <PLogo size={14} />
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.22)' }}>© 2026 KEY CHAIN. Real World Assets en Polygon.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Términos', 'Privacidad', 'Contacto'].map(l => (
            <span key={l}
              style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.22)', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.70)'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.22)'}
            >{l}</span>
          ))}
        </div>
      </footer>

    </div>
  );
}
