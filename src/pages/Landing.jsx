import { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { PLogo, Icons } from '../components/ui';
import StrategySimulator from '../components/StrategySimulator';
import { RWA_ASSETS, FACT_TOKEN } from '../data';
import { DEV_MODE } from '../lib/devSession';
import {
  unlockSound, isMuted, setMuted, onMuteChange, startAmbient, stopAmbient,
  sHover, sClick, sChime, sWhoosh, sPower, sPowerOff,
} from '../lib/landingSound';
// React Bits (https://reactbits.dev) — see components/reactbits/README.md
import LightRays from '../components/reactbits/LightRays';
import Particles from '../components/reactbits/Particles';
import BlurText from '../components/reactbits/BlurText';
import ShinyText from '../components/reactbits/ShinyText';
import GradientText from '../components/reactbits/GradientText';
import CountUp from '../components/reactbits/CountUp';
import DecryptedText from '../components/reactbits/DecryptedText';
import ScrollVelocity from '../components/reactbits/ScrollVelocity';
import ScrollReveal from '../components/reactbits/ScrollReveal';
import SpotlightCard from '../components/reactbits/SpotlightCard';
import MagicBento from '../components/reactbits/MagicBento';
import PhoneShowcase from '../components/landing/PhoneShowcase';
import CircularGallery from '../components/reactbits/CircularGallery';
import ClickSpark from '../components/reactbits/ClickSpark';
import LogoLoop from '../components/reactbits/LogoLoop';
import ParticleWord from '../components/landing/ParticleWord';
import ParticleImage from '../components/landing/ParticleImage';
import { AuditVisual, VaultVisual, YieldVisual, P2PVisual, VoteVisual, KycVisual } from '../components/landing/BentoVisuals';
import './Landing.css';


const HOW = [
  { n: '01', t: 'Verificá tu identidad', d: 'Completá el KYC en menos de 5 minutos. Solo DNI y selfie.', icon: Icons.shield, tint: '#4d8dff' },
  { n: '02', t: 'Elegí tu activo',       d: 'Explorá drones, campos, autos premium, edificios tokenizados.', icon: Icons.primary, tint: '#9b7bff' },
  { n: '03', t: 'Invertí en tokens',     d: 'Comprá fracciones desde tu wallet. Desde $1 USD.', icon: Icons.token, tint: '#f5a623' },
  { n: '04', t: 'Cobrá rendimientos',    d: 'Distribuciones mensuales en USDC directo a tu wallet.', icon: Icons.receive || Icons.wallet, tint: '#4ade80' },
];

const BENTO = [
  { color: '#0b0f1c', label: 'Seguridad',     title: 'Contratos auditados',     description: 'ERC-20 auditados por CertiK antes de cada emisión.', icon: Icons.shield, visual: <AuditVisual /> },
  { color: '#0b0f1c', label: 'Custodia',      title: 'Custodia institucional',  description: 'Activos físicos con custodia profesional y póliza de seguro.', icon: Icons.wallet, visual: <VaultVisual /> },
  { color: '#0d1226', label: 'Rendimiento',   title: 'Rendimientos en USDC',    description: 'Distribuciones on-chain mensuales directo a tu wallet. Sin bancos ni intermediarios, todo verificable on-chain.', icon: Icons.swap, visual: <YieldVisual /> },
  { color: '#0d1226', label: 'Liquidez',      title: 'Mercado secundario P2P',  description: 'Vendé tus tokens cuando quieras a otros inversores, comparando precio pedido contra valor real.', icon: Icons.token, visual: <P2PVisual /> },
  { color: '#0b0f1c', label: 'Gobernanza',    title: 'Votá con FACT',           description: 'Los holders deciden qué proyectos se tokenizan.', icon: Icons.primary, visual: <VoteVisual /> },
  { color: '#0b0f1c', label: 'Onboarding',    title: 'KYC en 5 minutos',        description: 'DNI y selfie. Empezás a invertir el mismo día.', icon: Icons.shield, visual: <KycVisual /> },
];

const COINS = {
  left: [
    { id: 'ETH',  color: '#627EEA', bg: 'rgba(98,126,234,0.12)',  x: -230, y: 110, mx: -122, my: 55,  size: 64, msize: 50, dur: 3.2, mz: 4, mop: 1.0,  src: '/crypto/eth.svg' },
    { id: 'BTC',  color: '#F7931A', bg: 'rgba(247,147,26,0.10)',  x: -390, y: 60,  mx: -152, my: 195, size: 44, msize: 28, dur: 2.8, mz: 1, mop: 0.45, src: '/crypto/btc.svg' },
    { id: 'USDT', color: '#26A17B', bg: 'rgba(38,161,123,0.10)',  x: -310, y: 205, mx: -90,  my: 268, size: 52, msize: 40, dur: 3.6, mz: 3, mop: 0.85, src: '/crypto/usdt.svg' },
    { id: 'SOL',  color: '#9945FF', bg: 'rgba(153,69,255,0.10)',  x: -165, y: 200, mx: -148, my: 310, size: 36, msize: 22, dur: 2.5, mz: 1, mop: 0.35, src: '/crypto/sol.svg' },
  ],
  right: [
    { id: 'POL',  color: '#8247E5', bg: 'rgba(130,71,229,0.12)', x: 230,  y: 110, mx: 122, my: 55,  size: 58, msize: 46, dur: 3.0, mz: 4, mop: 1.0,  src: '/crypto/matic.svg' },
    { id: 'USDC', color: '#2775CA', bg: 'rgba(39,117,202,0.10)', x: 390,  y: 55,  mx: 150, my: 195, size: 40, msize: 26, dur: 2.6, mz: 1, mop: 0.40, src: '/crypto/usdc.svg' },
    { id: 'BNB',  color: '#F3BA2F', bg: 'rgba(243,186,47,0.10)', x: 310,  y: 205, mx: 90,  my: 268, size: 70, msize: 42, dur: 3.4, mz: 3, mop: 0.90, src: '/crypto/bnb.svg' },
    { id: 'SOL2', color: '#9945FF', bg: 'rgba(153,69,255,0.10)', x: 165,  y: 200, mx: 148, my: 310, size: 32, msize: 20, dur: 2.9, mz: 1, mop: 0.35, src: '/crypto/sol.svg' },
  ],
};

// Blockchain networks the platform runs on
const CHAIN_LOGOS = [
  ['Polygon', '/crypto/matic.svg'], ['BNB Smart Chain (BSC)', '/crypto/bnb.svg'], ['Celo', '/crypto/celo.png'],
].map(([title, src]) => ({
  node: (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.62)', fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 17 }}>
      <img src={src} alt="" style={{ width: 30, height: 30, borderRadius: '50%' }} />
      {title}
    </span>
  ),
  title,
}));

// Built once: the WebGL gallery rebuilds whenever its `items` prop changes
// identity, so these must not be recreated on every render.
const REAL_ASSETS = RWA_ASSETS.filter(a => a.img && !a.name.startsWith('[QA]'));
const GALLERY_ITEMS = REAL_ASSETS.slice(0, 10).map(a => ({ image: a.img, text: a.name }));
const showcaseAssets = REAL_ASSETS.slice(0, 3);

const PARTICLE_COLORS = ['#ffffff', '#8fb8ff', '#b59bff'];
const MORPH_WORDS = ['autos', 'campos', 'drones', 'inmuebles', 'edificios'];
const MORPH_COLORS = ['#7fb2ff', '#93a8ff', '#a78bfa', '#c4a7ff', '#f0abfc'];

const HERO_LOGO_STYLE = { filter: 'drop-shadow(0 0 48px rgba(40,100,255,0.65)) drop-shadow(0 24px 64px rgba(0,0,0,0.95))' };
const NAV_LINKS = [['Proyectos', 'proyectos'], ['Cómo funciona', 'como'], ['Beneficios', 'beneficios'], ['Token FACT', 'fact']];

/* Liquid glass */
const LG = {
  background: 'rgba(255,255,255,0.045)',
  backdropFilter: 'blur(32px) saturate(160%)',
  WebkitBackdropFilter: 'blur(32px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 20,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.13), 0 20px 60px rgba(0,0,0,0.70)',
};

// "Entrar dev" — skips the wallet login (see lib/devSession). Dashed amber so
// it never gets mistaken for the real "Iniciar sesión" button.
const DEV_BTN = {
  padding: '6px 14px', fontSize: 13, fontFamily: 'var(--font-b)',
  fontWeight: 700, borderRadius: 10, cursor: 'pointer', height: 36,
  background: 'rgba(255,184,0,0.10)', color: '#ffc94d',
  border: '1px dashed rgba(255,184,0,0.55)',
};

const KICKER = { fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(140,180,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 14, fontWeight: 700 };

const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

// Section title: kicker + word-by-word blur-in, with a whoosh when it shows up.
function SectionHead({ kicker, title, sub, align = 'center' }) {
  return (
    <motion.div onViewportEnter={sWhoosh} viewport={{ once: true, amount: 0.6 }}
      style={{ textAlign: align, marginBottom: 48 }}>
      <div style={KICKER}>{kicker}</div>
      <BlurText text={title} delay={70} animateBy="words" direction="top" className="land-h2" />
      {sub && (
        <motion.p initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.35 }}
          style={{ fontFamily: 'var(--font-b)', fontSize: 16, color: 'rgba(255,255,255,0.42)', marginTop: 14, lineHeight: 1.65, maxWidth: 560, marginLeft: align === 'center' ? 'auto' : 0, marginRight: align === 'center' ? 'auto' : 0 }}>
          {sub}
        </motion.p>
      )}
    </motion.div>
  );
}

// One button style for the whole landing: same pill, same motion.
// primary = white with a light sweep; ghost = glass with a gradient rim.
function LBtn({ children, onClick, variant = 'primary', size = 'md', block, chime, icon, className = '' }) {
  return (
    <button onMouseEnter={sHover} onClick={() => { if (chime) sChime(); onClick?.(); }}
      className={`lbtn lbtn-${variant} lbtn-${size}${block ? ' lbtn-block' : ''} ${className}`}>
      {icon}
      <span>{children}</span>
      {variant === 'primary' && <span className="lbtn-arrow" aria-hidden="true">→</span>}
    </button>
  );
}

const BOLT = <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;

// RWA card header: three project photos fanned out; they spread on hover.
function FannedPhotos({ assets }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => { setHover(true); sHover(); }} onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', height: 150, marginBottom: 22, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {assets.map((a, i) => {
        const k = i - 1;
        return (
          <motion.div key={a.id} animate={{ x: k * (hover ? 120 : 80), rotate: k * (hover ? 10 : 7), y: Math.abs(k) * (hover ? 14 : 8), scale: k === 0 ? 1.04 : 0.94 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            style={{ position: 'absolute', width: 150, height: 120, borderRadius: 16, overflow: 'hidden', zIndex: k === 0 ? 2 : 1,
              border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 18px 40px rgba(0,0,0,0.55)' }}>
            <img src={a.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.75))' }} />
            <div style={{ position: 'absolute', left: 8, right: 8, bottom: 7, fontFamily: 'var(--font-b)', fontSize: 10.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
            <div style={{ position: 'absolute', top: 7, right: 7, padding: '2px 7px', borderRadius: 999, background: 'rgba(74,222,128,0.9)', color: '#052e14', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-b)' }}>{a.apy}%</div>
          </motion.div>
        );
      })}
    </div>
  );
}

// FACT card header: ICO progress as a glowing ring around the token.
function IcoRing({ pct }) {
  const R = 58, C = 2 * Math.PI * R;
  return (
    <div style={{ height: 150, marginBottom: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 124, height: 124 }}>
        <svg width="124" height="124" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <defs>
            <linearGradient id="icoGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7fb2ff" /><stop offset="100%" stopColor="#c084fc" /></linearGradient>
          </defs>
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          <motion.circle cx="70" cy="70" r={R} fill="none" stroke="url(#icoGrad)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} initial={{ strokeDashoffset: C }} whileInView={{ strokeDashoffset: C * (1 - pct / 100) }} viewport={{ once: true }}
            transition={{ duration: 1.8, ease: 'easeOut' }} style={{ filter: 'drop-shadow(0 0 8px rgba(160,140,255,0.7)) drop-shadow(0 0 18px rgba(127,150,255,0.45))' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: '#fff' }}><CountUp to={pct} duration={1.8} />%</div>
          <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Recaudado</div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
        ${(FACT_TOKEN.raised / 1e6).toFixed(2)}M de ${(FACT_TOKEN.goal / 1e6).toFixed(1)}M · {FACT_TOKEN.holders.toLocaleString()} holders
      </div>

    </div>
  );
}

// Hero play button: turns the page's sounds + ambient music on, with a
// shockwave that sweeps the whole page; clicking again turns it all off.
function SoundPower({ onPulse }) {
  const [on, setOn] = useState(!isMuted());
  useEffect(() => onMuteChange(m => setOn(!m)), []);
  const toggle = (e) => {
    e.stopPropagation(); // no click-spark pop on top of the power sound
    unlockSound();
    if (on) {
      sPowerOff();
      stopAmbient();
      setTimeout(() => setMuted(true), 260);
      setOn(false);
      return;
    }
    setMuted(false);
    sPower();
    startAmbient();
    const r = e.currentTarget.getBoundingClientRect();
    onPulse({ x: r.left + r.width / 2, y: r.top + r.height / 2, id: Date.now() });
  };
  return (
    <motion.button className={`land-power${on ? ' on' : ''}`} onClick={toggle} onMouseEnter={sHover}
      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
      aria-pressed={on} aria-label={on ? 'Apagar sonido y música' : 'Activar sonido y música'}>
      <span className="land-power-btn">
        {on ? (
          <span className="land-eq" aria-hidden="true">{[0, 1, 2, 3].map(i => <i key={i} style={{ animationDelay: `${i * 0.13}s` }} />)}</span>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginLeft: 2 }}><path d="M7 4.5v15a1 1 0 001.52.85l12-7.5a1 1 0 000-1.7l-12-7.5A1 1 0 007 4.5z" /></svg>
        )}
      </span>
      <span className="land-power-txt">{on ? 'Sonido activado' : 'Activar experiencia'}</span>
    </motion.button>
  );
}

// Full-page shockwave fired from the play button.
function PowerPulse({ pulse }) {
  if (!pulse) return null;
  const R = Math.hypot(Math.max(pulse.x, window.innerWidth - pulse.x), Math.max(pulse.y, window.innerHeight - pulse.y)) * 2.2;
  const ring = (delay, width, color) => (
    <motion.span initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1, opacity: 0 }} transition={{ duration: 1.5, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: 'absolute', left: pulse.x - R / 2, top: pulse.y - R / 2, width: R, height: R, borderRadius: '50%', border: `${width}px solid ${color}`, boxShadow: `0 0 40px ${color}, inset 0 0 40px ${color}` }} />
  );
  return (
    <div key={pulse.id} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 80, pointerEvents: 'none', overflow: 'hidden' }}>
      <motion.span initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }}
        style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at ${pulse.x}px ${pulse.y}px, rgba(127,178,255,0.45), rgba(167,139,250,0.18) 35%, transparent 70%)` }} />
      {ring(0, 2, 'rgba(127,178,255,0.75)')}
      {ring(0.14, 1, 'rgba(181,155,255,0.55)')}
      {ring(0.3, 1, 'rgba(255,255,255,0.25)')}
    </div>
  );
}

export default function Landing({ onEnter, onDevEnter }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pulse, setPulse] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [activeStep, setActiveStep] = useState(0);
  const [stepsPaused, setStepsPaused] = useState(false);
  const STEP_MS = 5200;
  useEffect(() => {
    if (stepsPaused) return undefined;
    const id = setTimeout(() => setActiveStep(s => (s + 1) % HOW.length), STEP_MS);
    return () => clearTimeout(id);
  }, [activeStep, stepsPaused]);
  useEffect(() => {
    const h = () => { setIsMobile(window.innerWidth < 768); if (window.innerWidth > 767) setMenuOpen(false); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // First gesture anywhere unlocks audio (browser autoplay policy)
  useEffect(() => {
    const u = () => unlockSound();
    window.addEventListener('pointerdown', u, { once: true });
    window.addEventListener('keydown', u, { once: true });
    return () => { window.removeEventListener('pointerdown', u); window.removeEventListener('keydown', u); stopAmbient(); };
  }, []);

  // Parallax (mouse on desktop, gyroscope on phones)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });
  const coinsX = useTransform(springX, [-1, 1], [-18, 18]);
  const coinsY = useTransform(springY, [-1, 1], [-10, 10]);
  const imgX = useTransform(springX, [-1, 1], [22, -22]);
  const imgY = useTransform(springY, [-1, 1], [14, -14]);

  useEffect(() => {
    if (!isMobile) return undefined;
    const handler = (e) => {
      mouseX.set(Math.max(-30, Math.min(30, e.gamma || 0)) / 30);
      mouseY.set(Math.max(-20, Math.min(20, (e.beta || 0) - 45)) / 20);
    };
    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
  }, [isMobile, mouseX, mouseY]);

  const onMouseMove = useCallback((e) => {
    if (isMobile) return;
    mouseX.set((e.clientX / window.innerWidth) * 2 - 1);
    mouseY.set((e.clientY / window.innerHeight) * 2 - 1);
  }, [isMobile, mouseX, mouseY]);

  const factPct = Math.round((FACT_TOKEN.raised / FACT_TOKEN.goal) * 100);

  const coin = (c, i, side) => {
    const cx = isMobile ? c.mx : c.x, cy = isMobile ? c.my : c.y, cs = isMobile ? c.msize : c.size;
    return (
      <motion.div key={c.id}
        initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: isMobile ? c.mop : 1, scale: 1 }} transition={{ delay: 0.9 + i * 0.1 + (side ? 0.05 : 0), duration: 0.45 }}
        style={{ position: 'absolute', left: `calc(50% + ${cx}px)`, bottom: cy, x: coinsX, y: coinsY, transform: 'translateX(-50%)', zIndex: isMobile ? c.mz : 3 }}>
        <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: c.dur, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.18, rotate: 12 }} onHoverStart={sHover}
          style={{ width: cs, height: cs, borderRadius: '50%', background: c.bg, border: `1.5px solid ${c.color}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: `0 4px 28px ${c.color}28, inset 0 1px 0 rgba(255,255,255,0.18)` }}>
          <img src={c.src} alt={c.id} style={{ width: '60%', height: '60%', objectFit: 'contain' }} />
        </motion.div>
      </motion.div>
    );
  };

  return (
    <ClickSpark fixed sparkColor="#9cc3ff" sparkSize={11} sparkRadius={22} sparkCount={10} duration={480} onSpark={sClick}>
      <div onMouseMove={onMouseMove} style={{ minHeight: '100vh', background: '#07080c', overflowX: 'hidden', position: 'relative', paddingTop: 64 }}>

        {/* Page-wide particle field */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.7 }}>
          <Particles particleCount={isMobile ? 90 : 180} particleSpread={12} speed={0.06} particleColors={PARTICLE_COLORS}
            alphaParticles particleBaseSize={70} sizeRandomness={1} moveParticlesOnHover={!isMobile} particleHoverFactor={0.6} disableRotation={false} />
        </div>

        {/* ─── NAV ─────────────────────────────────────────────── */}
        <nav className="land-nav navbar-glow" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 64,
          background: 'rgba(7,8,12,0.72)', borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', gap: 12,
        }}>
          <PLogo size={16} />
          <div className="land-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
            {NAV_LINKS.map(([l, id]) => (
              <button key={l} onMouseEnter={sHover} onClick={() => scrollToId(id)} className="land-navlink"
                style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-b)', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                <DecryptedText text={l} speed={35} maxIterations={8} animateOn="hover" className="land-navlink-txt" encryptedClassName="land-navlink-enc" />
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="land-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {DEV_MODE && onDevEnter && (
                <button onClick={onDevEnter} title="Entrar sin wallet (solo desarrollo)" style={DEV_BTN}>Entrar dev</button>
              )}
              <LBtn size="sm" onClick={onEnter}>Iniciar sesión</LBtn>
            </div>
            <button className="land-hamburger" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuOpen(o => !o)}
              style={{ display: 'none', width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.8)', flexShrink: 0, position: 'relative' }}>
              {[0, 1, 2].map(i => (
                <motion.span key={i} initial={false}
                  animate={menuOpen ? (i === 1 ? { opacity: 0 } : { y: i === 0 ? 6 : -6, rotate: i === 0 ? 45 : -45 }) : { opacity: 1, y: 0, rotate: 0 }}
                  style={{ position: 'absolute', left: 10, top: 12 + i * 6, width: 16, height: 2, borderRadius: 2, background: 'currentColor' }} />
              ))}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}
              style={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 49, background: 'rgba(7,8,12,0.96)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px 24px', display: 'flex', flexDirection: 'column' }}>
              {NAV_LINKS.map(([l, id], i) => (
                <motion.button key={l} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}
                  onClick={() => { setMenuOpen(false); setTimeout(() => scrollToId(id), 60); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-h)', fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.85)', padding: '12px 2px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {l}
                </motion.button>
              ))}
              <div style={{ marginTop: 18 }}>
                <LBtn block size="lg" chime onClick={() => { setMenuOpen(false); onEnter(); }}>Iniciar sesión</LBtn>
              </div>
              {DEV_MODE && onDevEnter && (
                <button onClick={() => { setMenuOpen(false); onDevEnter(); }}
                  style={{ ...DEV_BTN, marginTop: 10, width: '100%', height: 'auto', padding: '12px 20px', fontSize: 15, borderRadius: 14 }}>Entrar dev</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── HERO ───────────────────────────────────────────── */}
        <section className="land-hero-section" style={{ position: 'relative', zIndex: 2, padding: '36px 48px 0', textAlign: 'center' }}>
          {/* Light rays from the top, following the cursor */}
          <div style={{ position: 'absolute', top: -64, left: 0, right: 0, height: '115vh', pointerEvents: 'none', zIndex: 0 }}>
            <LightRays raysOrigin="top-center" raysColor="#6aa2ff" raysSpeed={1.1} lightSpread={0.9} rayLength={1.4}
              followMouse mouseInfluence={0.12} noiseAmount={0.06} distortion={0.04} className="land-rays" />
          </div>
          <div style={{ position: 'absolute', bottom: -60, left: '50%', transform: 'translateX(-50%)', width: 1000, maxWidth: '120vw', height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(30,80,220,0.30) 0%, transparent 68%)', filter: 'blur(70px)', pointerEvents: 'none', zIndex: 0 }} />

          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 28, position: 'relative', zIndex: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ ...LG, borderRadius: 999, padding: '7px 16px', display: 'inline-flex', gap: 8, alignItems: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px rgba(74,222,128,0.8)' }} />
              <ShinyText text="Activos reales tokenizados" speed={2.6} color="rgba(255,255,255,0.55)" shineColor="#ffffff" className="land-shiny" />
            </div>
          </motion.div>

          <div role="heading" aria-level={1} className="land-hero-h1" style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 'clamp(40px, 7vw, 82px)', lineHeight: 1.02, letterSpacing: '-0.05em', color: 'rgba(255,255,255,0.96)', margin: '0 auto 22px', maxWidth: 980, position: 'relative', zIndex: 1 }}>
            <BlurText text="Cociná tu fábrica" delay={110} animateBy="words" direction="top" className="land-h1-line" />
            <motion.div initial={{ opacity: 0, filter: 'blur(12px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ delay: 0.55, duration: 0.7 }}>
              <GradientText colors={['#ffffff', '#8fb8ff', '#b59bff', '#ffffff']} animationSpeed={7} className="land-h1-grad">de tokenizaciones.</GradientText>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="land-hero-sub land-morph" style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto 30px' }}>
            <div className="land-morph-label">Invertí en</div>
            <ParticleWord words={MORPH_WORDS} colors={MORPH_COLORS} fontSize={isMobile ? 50 : 76} gap={isMobile ? 2.4 : 3} interval={2900} />
            <div className="land-morph-tail">tokenizados, desde $1 y con rentas mensuales en USDC.</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="land-hero-power"
            style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <SoundPower onPulse={setPulse} />
          </motion.div>


          {/* Visual: oven with floating coins */}
          <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8 }}
            className="land-hero-visual" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', minHeight: 340, zIndex: 1 }}>
            <div style={{ position: 'absolute', top: '45%', left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(60,120,255,0.30), rgba(80,150,255,0.55), rgba(60,120,255,0.30), transparent)', filter: 'blur(1px)', pointerEvents: 'none' }} />
            {COINS.left.map((c, i) => coin(c, i, 0))}
            {COINS.right.map((c, i) => coin(c, i, 1))}
            <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-52%)', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(30,90,230,0.36) 0%, transparent 68%)', filter: 'blur(36px)', pointerEvents: 'none' }} />
              {/* Parallax and levitation live on separate layers so they add up
                  smoothly instead of fighting over the same `y`. */}
              <motion.div style={{ x: imgX, y: imgY, position: 'relative', zIndex: 1 }}>
                <div className="land-levitate">
                  <ParticleImage src="/3ds.png" alt="KEY CHAIN" width={isMobile ? 220 : 300} gap={isMobile ? 2.5 : 3}
                    onHoverStart={sHover} onBurst={sWhoosh} imgStyle={HERO_LOGO_STYLE} />
                </div>
              </motion.div>
            </div>
          </motion.div>

          <div style={{ height: 48 }} />
        </section>

        {/* ─── Built on ───────────────────────────────────────── */}
        <section style={{ position: 'relative', zIndex: 2, padding: '8px 0 40px' }}>
          <div style={{ ...KICKER, textAlign: 'center', color: 'rgba(255,255,255,0.32)' }}>Redes blockchain compatibles</div>
          <LogoLoop logos={CHAIN_LOGOS} speed={60} direction="left" logoHeight={28} gap={96} pauseOnHover scaleOnHover fadeOut fadeOutColor="#07080c" ariaLabel="Redes blockchain" />
        </section>

        {/* ─── Velocity band ──────────────────────────────────── */}
        <section className="land-velocity" style={{ position: 'relative', zIndex: 2, padding: '30px 0 70px' }}>
          <ScrollVelocity texts={['Autos ✦ Campos ✦ Drones ✦ Inmuebles ✦ Edificios ✦', 'Tokenizá ✦ Invertí ✦ Cobrá en USDC ✦']} velocity={60} className="land-velocity-text" />
        </section>

        {/* ─── DOS FORMAS ─────────────────────────────────────── */}
        <section id="fact" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 96px', position: 'relative', zIndex: 2, scrollMarginTop: 80 }} className="land-section">
          <SectionHead kicker="Dos formas de invertir" title="Invertí en proyectos o en la empresa misma" sub="Elegí entre activos tokenizados del mundo real o el token FACT de la plataforma." />
          <div className="land-invest-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {[
              {
                tag: <span className="land-pill"><span className="land-pill-dot" style={{ background: '#7fb2ff', boxShadow: '0 0 8px rgba(127,178,255,0.8)' }} />Proyectos RWA · Abiertos</span>, title: <>Activos del<br />mundo real</>, spot: 'rgba(110,160,255,0.28)',
                text: 'Invertí en fracciones de autos, campos, drones, inmuebles y edificios tokenizados. Cada token representa participación proporcional del activo.',
                kpis: [['Desde', '$1 USD'], ['APY promedio', '9.8%'], ['Distribución', 'Mensual USDC'], ['Proyectos activos', '148']],
                bullets: ['Rendimientos mensuales on-chain', 'Liquidez en mercado secundario P2P', 'Contratos auditados · Seguro incluido', 'Sin bancos ni intermediarios'],
                cta: 'Explorar proyectos →', primary: false, visual: 'photos',
              },
              {
                tag: <span className="land-pill land-pill-green"><span className="land-pill-dot" style={{ background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.8)' }} />ICO activa · Ronda pública</span>,
                title: <>Token FACT<br />— la empresa</>, spot: 'rgba(181,155,255,0.28)',
                text: 'FACT es el token de utilidad de la plataforma. Al invertir en la ICO participás del crecimiento: descuentos en fees, gobernanza DAO y staking.',
                kpis: [['Precio ICO', `$${FACT_TOKEN.price}`], ['Staking APY', '9–14%'], ['TGE', '15% inmediato'], ['Vesting', '12 meses']],
                bullets: ['50% de descuento en fees de plataforma', 'Gobernanza DAO · Votás los proyectos', 'Staking con APY 9–14% anual', 'Acceso anticipado a proyectos nuevos'],
                cta: 'Participar en la ICO →', primary: true, visual: 'ring',
              },
            ].map((c, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.12 }}
                onMouseEnter={sHover} style={{ display: 'flex' }}>
                <SpotlightCard spotlightColor={c.spot} className="land-spot">
                  {c.visual === 'photos' ? <FannedPhotos assets={showcaseAssets} /> : <IcoRing pct={factPct} />}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ marginBottom: 12 }}>{c.tag}</div>
                    <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 28, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{c.title}</div>
                  </div>
                  <p style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.65, margin: '0 0 22px', minHeight: '4.95em' }}>{c.text}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
                    {c.kpis.map(([l, v]) => (
                      <div key={l} className="land-kpi">
                        <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{l}</div>
                        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: '#fff' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26, flex: 1 }}>
                    {c.bullets.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'rgba(255,255,255,0.58)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <LBtn block variant={c.primary ? 'primary' : 'ghost'} chime={c.primary} onClick={c.primary ? onEnter : () => scrollToId('proyectos')}>{c.cta.replace(' →', '')}</LBtn>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── BENEFICIOS (Magic Bento) ───────────────────────── */}
        <section id="beneficios" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 96px', position: 'relative', zIndex: 2, scrollMarginTop: 80 }} className="land-section">
          <SectionHead kicker="Por qué KEY CHAIN" title="Seguridad y transparencia, sin compromiso" sub="Pasá el cursor por las tarjetas: cada beneficio está respaldado on-chain." />
          <div className="land-bento" onMouseEnter={sHover}>
            <MagicBento cards={BENTO} textAutoHide={false} enableStars enableSpotlight enableBorderGlow enableTilt={false}
              enableMagnetism clickEffect spotlightRadius={320} particleCount={10} glowColor="110, 160, 255" />
          </div>
        </section>

        {/* ─── CÓMO FUNCIONA (steps drive a live showcase) ───── */}
        <section id="como" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 110px', position: 'relative', zIndex: 2, scrollMarginTop: 80 }} className="land-section">
          <SectionHead kicker="Cómo funciona" title="Empezá en 4 pasos" sub="Del registro a tu primera renta en USDC, todo desde el celular." />
          <div className="land-how" onMouseEnter={() => setStepsPaused(true)} onMouseLeave={() => setStepsPaused(false)}>
            <ol className="how-list">
              {HOW.map((h, i) => {
                const on = activeStep === i;
                return (
                  <li key={h.n}>
                    <button className={`how-step${on ? ' on' : ''}`} onMouseEnter={sHover} onClick={() => { setActiveStep(i); sWhoosh(); }}>
                      <span className="how-num">{h.n}</span>
                      <span className="how-body">
                        <span className="how-title">{h.t}</span>
                        <span className="how-desc">{h.d}</span>
                        <span className="how-track">
                          {on && (
                            <motion.span key={`${activeStep}-${stepsPaused}`} className="how-fill"
                              initial={{ width: stepsPaused ? '100%' : '0%' }} animate={{ width: '100%' }}
                              transition={{ duration: stepsPaused ? 0 : STEP_MS / 1000, ease: 'linear' }} />
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <PhoneShowcase step={activeStep} asset={showcaseAssets[0]} next={showcaseAssets[1]} />
          </div>
        </section>

        {/* ─── PROYECTOS (Circular Gallery) ───────────────────── */}
        <section id="proyectos" style={{ position: 'relative', zIndex: 2, padding: '40px 0 60px', scrollMarginTop: 80 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }} className="land-section-pad">
            <SectionHead kicker="Proyectos destacados" title="Activos disponibles hoy" sub="Arrastrá la galería para recorrer los proyectos." />
          </div>
          <div style={{ height: isMobile ? 380 : 560, position: 'relative' }} onPointerDown={sHover}>
            <CircularGallery items={GALLERY_ITEMS} bend={isMobile ? 1.5 : 2.6} textColor="#ffffff" borderRadius={0.06} scrollSpeed={2} scrollEase={0.05} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <LBtn variant="ghost" onClick={onEnter}>Ver los {RWA_ASSETS.length} proyectos</LBtn>
          </div>
        </section>

        {/* ─── SIMULADOR ──────────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <StrategySimulator head={
            <SectionHead kicker="Para emprendedores · B2B" title="Simulá la tokenización de tu proyecto"
              sub="Elegí el modelo, configurá los parámetros de tu empresa y mirá cuánto podés levantar en tu ronda." />
          } />
        </div>

        {/* ─── CTA ────────────────────────────────────────────── */}
        <section style={{ position: 'relative', zIndex: 2, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, maxWidth: '120vw', height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(70,110,255,0.16) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '110px 48px', textAlign: 'center', position: 'relative' }} className="land-cta-section">
            <ScrollReveal baseOpacity={0.08} enableBlur baseRotation={3} blurStrength={6} containerClassName="land-reveal" textClassName="land-reveal-text">
              Tu capital, trabajando sin intermediarios.
            </ScrollReveal>
            <p style={{ fontFamily: 'var(--font-b)', fontSize: 16, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, maxWidth: 520, margin: '10px auto 40px' }}>
              Uníte a miles de inversores que ya generan rendimientos reales en USDC, con plena transparencia on-chain.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <LBtn onClick={onEnter} chime icon={BOLT} size="xl">Comenzar ahora</LBtn>
            </div>
            <div style={{ marginTop: 40, display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Regulado', 'Contratos auditados CertiK', 'Custodia institucional', 'KYC verificado'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }} onMouseEnter={sHover}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <DecryptedText text={t} animateOn="hover" speed={30} maxIterations={6} className="land-trust" encryptedClassName="land-trust-enc" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─────────────────────────────────────────── */}
        <footer className="land-nav" style={{ padding: '28px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <PLogo size={14} />
          <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>© 2026 KEY CHAIN. Activos reales tokenizados.</span>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Términos', 'Privacidad', 'Contacto'].map(l => (
              <button key={l} onMouseEnter={sHover} className="land-footlink" style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-b)', fontSize: 12, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
        </footer>
      </div>
      <PowerPulse pulse={pulse} />
    </ClickSpark>
  );
}
