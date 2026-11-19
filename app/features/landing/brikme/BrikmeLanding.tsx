import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router';
import CountUp from '~/components/reactbits/CountUp';
import BlurText from '~/components/reactbits/BlurText';
import DecryptedText from '~/components/reactbits/DecryptedText';
import ScrollReveal from '~/components/reactbits/ScrollReveal';
import { useHydrated } from '~/hooks/useHydrated';
import { useMobile } from '~/hooks/useMobile';
import { BrikmeMark, type CubeTone } from './geometry';
import type { PhysCube } from './Physics';
import { GiantType, HeroLoader, Horizon } from './effects';
import SectorExplorer, { type Sector } from './SectorExplorer';
import LanguageSwitcher from '~/i18n/LanguageSwitcher';
import { useT } from '~/i18n/useT';
import { HERO_ITEMS } from './heroItems';

// three.js scenes: client-only, loaded after hydration (the SVG mark is the fallback).
const Logo3D = lazy(() => import('./Scene3D').then(m => ({ default: m.Logo3D })));
const TokenBlock3D = lazy(() => import('./Scene3D').then(m => ({ default: m.TokenBlock3D })));
const HeroCarousel = lazy(() => import('./HeroCarousel'));
const PhysicsPlayground = lazy(() => import('./Physics').then(m => ({ default: m.PhysicsPlayground })));
import './BrikmeLanding.css';

/*
 * Brikme landing — light, institutional, "del plano a la propiedad".
 * Content comes from the client's deck (Brikme_Tokenizacion_2026) and brand
 * manual: blueprint lines, the isometric cube, Dubai, navy + turquoise + orange.
 * Straight corners and 1px hairlines everywhere (no rounded pills).
 */

const EASE = [0.2, 0.7, 0.2, 1] as const;

// Intro (first load only): 5 s loader → 2 s dark stage → studio lights switch on.
// Coming back to the landing from inside the app goes straight to the lit stage.
let introPlayed = false;
const LOADER_MIN_MS = 5000;
const LOADER_MAX_MS = 30000; // never hold the intro longer on a slow network (the car is ~11 MB)
const DARK_MS = 2000;
type IntroPhase = 'loading' | 'dark' | 'on';
const LOGIN_PATH = '/ingresar';
const MARKET_PATH = '/tokenizaciones';

// Section ids; labels are `nav.items.<id>` in the landing dictionary.
const NAV: readonly string[] = ['vision', 'mercado', 'sectores', 'modelo', 'liderazgo', 'contacto'];
// Public pages, listed for crawlers and screen readers. Labels are `links.<key>`.
const SITE_LINKS: ReadonlyArray<readonly [key: string, href: string]> = [
  ['tokenizations', '/tokenizaciones'], ['secondary', '/mercado-secundario'], ['academy', '/academia'], ['help', '/ayuda'],
];
const FOOTER_LINKS: ReadonlyArray<readonly [key: string, href: string]> = [
  ['projects', '/tokenizaciones'], ['academy', '/academia'], ['help', '/ayuda'], ['terms', '/terminos'], ['privacy', '/privacidad'],
];

const scrollToId = (id: string): void => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* ── Building blocks ─────────────────────────────────────────────── */

type BtnProps = { children: ReactNode; href: string; onClick: () => void; variant?: 'solid' | 'line' | 'ghost-light' | 'accent'; arrow?: boolean; className?: string };

/** Square, institutional button. Real link (crawlable) with in-app navigation. */
function Btn({ children, href, onClick, variant = 'solid', arrow = true, className = '' }: BtnProps) {
  return (
    <a href={href} className={`bk-btn bk-btn-${variant} ${className}`}
      onClick={e => { e.preventDefault(); onClick(); }}>
      <span>{children}</span>
      {arrow && <span className="bk-btn-arrow" aria-hidden="true">→</span>}
    </a>
  );
}

/** Masked line reveal: text slides up from behind its own baseline. */
// The trigger lives on the mask (always on screen); the text inside starts
// below it, clipped, so observing the text itself would never fire.
const LINE_VARIANTS = { hidden: { y: '110%' }, show: { y: '0%' } } as const;

function Line({ children, delay = 0, inView = false, play = true, className = '' }: { children: ReactNode; delay?: number; inView?: boolean; play?: boolean; className?: string }) {
  return (
    <motion.span className={`bk-line ${className}`} initial="hidden"
      {...(inView ? { whileInView: 'show', viewport: { once: true, amount: 0.5 } } : { animate: play ? 'show' : 'hidden' })}>
      <motion.span className="bk-line-in" variants={LINE_VARIANTS} transition={{ delay, duration: 1, ease: EASE }}>
        {children}
      </motion.span>
    </motion.span>
  );
}

type HeadProps = { index?: string; kicker: string; thin: string; bold: string; sub?: ReactNode; tone?: 'light' | 'dark'; align?: 'left' | 'center' };

/** Section heading: numbered kicker (decrypts in), large thin/bold title (React Bits BlurText). */
function Head({ index, kicker, thin, bold, sub, tone = 'light', align = 'left' }: HeadProps) {
  return (
    <header className={`bk-head bk-head-${tone} bk-head-${align}`}>
      <motion.div className="bk-kicker" initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        {index && <span className="bk-kicker-n">{index}</span>}
        <motion.span className="bk-kicker-rule" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }} />
        <DecryptedText text={kicker} animateOn="view" sequential speed={28} revealDirection="start" encryptedClassName="bk-kicker-enc" />
      </motion.div>
      <h2 className="sr-only">{thin} {bold}</h2>
      <div className="bk-h2" aria-hidden="true">
        <BlurText text={thin} animateBy="words" direction="bottom" delay={90} className="bk-bt bk-thin" />
        <BlurText text={bold} animateBy="words" direction="bottom" delay={90} className="bk-bt bk-bold" />
      </div>
      {sub && (
        <motion.p className="bk-sub" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.25 }}>
          {sub}
        </motion.p>
      )}
    </header>
  );
}

/** Blueprint crop marks on the four corners of a box. */
function Corners() {
  return <span className="bk-corners" aria-hidden="true"><i /><i /><i /><i /></span>;
}

// Curtain reveal: a navy panel slides off the image. The observed element is
// never clipped itself (a fully clipped target would never report "in view").
const CURTAIN_Y = { hidden: { scaleY: 1 }, show: { scaleY: 0 } } as const;
const CURTAIN_X = { hidden: { scaleX: 1 }, show: { scaleX: 0 } } as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.8, delay, ease: EASE },
});

/* ── Data (client deck) ──────────────────────────────────────────── */

// Texts live in the landing dictionary (app/i18n/locales/<lang>/landing.json);
// here only values, figures, ids and images. Lists are read with raw() by index or id.

type Text2 = { t: string; d: string };

/** Hero figures (labels: `figures.stats[i]`). */
const HERO_STAT_VALUES: readonly ReactNode[] = [
  <>$<CountUp to={200} duration={1.6} /></>,
  <><CountUp to={24} duration={1.6} />/7</>,
  <CountUp to={6} duration={1.6} />,
  'VARA',
];

/** Evolution columns (verb + description: `vision.evolution[i]`). */
const EVOLUTION_WEBS: readonly string[] = ['Web 1', 'Web 2', 'Web 3'];

// Cube edge ∝ value^(1/3): the volumes are to scale (DeFi = 1 unit). Names: `market.names[i]`.
const MARKETS: ReadonlyArray<{ value: string; units: number; tone: CubeTone }> = [
  { value: '$120B', units: 1, tone: 'navy' },
  { value: '$3.6T', units: 3.1, tone: 'steel' },
  { value: '$115T', units: 9.9, tone: 'sand' },
  { value: '$380T', units: 14.7, tone: 'concrete' },
  { value: '$1Q', units: 20.3, tone: 'glass' },
];

/** State reserves (flag + text: `adoption.states[i]`); `sep` is the language's thousands separator. */
const stateValues = (sep: string): readonly ReactNode[] => [
  <><CountUp to={328000} separator={sep} duration={2.2} /> BTC</>,
  <><CountUp to={7500} separator={sep} duration={2} />+ BTC</>,
  <>$<CountUp to={16000} separator={sep} duration={2} />M</>,
];

/** Institution names (texts: `adoption.institutions[i]`). */
const INSTITUTIONS: readonly string[] = ['BlackRock', 'Fidelity', 'Nasdaq'];

/** Pillar numbers (texts: `bridge.pillars[i]`). */
const PILLAR_NUMBERS: readonly string[] = ['01', '02', '03'];

// Photos: Unsplash (free licence), 1600×1067 WebP in public/images/brikme/sectors.
// Name and description: `sectors.items.<id>`.
const SECTOR_IMAGES: ReadonlyArray<{ id: string; img: string }> = [
  { id: 'real-estate', img: '/images/brikme/sectors/real-estate.webp' },
  { id: 'mineria', img: '/images/brikme/sectors/mineria.webp' },
  { id: 'agricultura', img: '/images/brikme/sectors/agricultura.webp' },
  { id: 'energia', img: '/images/brikme/sectors/energia.webp' },
  { id: 'transporte', img: '/images/brikme/sectors/transporte.webp' },
  { id: 'lujo', img: '/images/brikme/sectors/lujo.webp' },
];

/** Club figures (labels: `club.facts[i]`). */
const CLUB_VALUES: readonly string[] = ['$200', '24/7', '0'];

/** Token types (texts: `engine.tokens.<id>`). */
const TOKENS: ReadonlyArray<{ id: string; focus?: boolean; faint?: boolean }> = [
  { id: 'utility' },
  { id: 'security' },
  { id: 'stable' },
  { id: 'rwa', focus: true },
  { id: 'nft', faint: true },
];

/* ── Sections ────────────────────────────────────────────────────── */

// Evolution cubes in one physics world: grab, lift, throw; they collide and stack.
// Web 3 ("Own") is a cube of tokens: 3×3×3 pieces that come apart when hit or pulled.
const EVO_CUBES: readonly PhysCube[] = [
  { size: 1.0, tone: 'concrete', slot: -1 / 3 },
  { size: 1.3, tone: 'sand', slot: 0 },
  { size: 1.62, tone: 'blue', slot: 1 / 3, split: 3, edges: true },
];

function Evolution() {
  const hydrated = useHydrated();
  const { t, raw } = useT('landing');
  const evolution = raw<{ verb: string; desc: string }[]>('vision.evolution');
  return (
    <div className="bk-evo-x">
      <div className="bk-evo-stage">
        {hydrated
          ? <Suspense fallback={null}><PhysicsPlayground cubes={EVO_CUBES} zoom={92} className="bk-phys" label={t('vision.physicsLabel')} /></Suspense>
          : null}
        <span className="bk-hint bk-hint-evo" aria-hidden="true">{t('vision.hint')}</span>
      </div>
      <div className="bk-evo">
        {EVOLUTION_WEBS.map((web, i) => (
          <motion.div key={web} className="bk-evo-col" {...fadeUp(i * 0.15)}>
            <div className="bk-evo-txt">
              <span className="bk-evo-web">{web}</span>
              <span className="bk-evo-verb">{evolution[i].verb}</span>
              <span className="bk-evo-desc">{evolution[i].desc}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Market cubes, volume to scale, also in a physics world (dark band).
const MARKET_CUBES: readonly PhysCube[] = [
  { size: 1, tone: 'navy', slot: -0.4 },
  { size: 3.1, tone: 'steel', slot: -0.2 },
  { size: 9.9, tone: 'sand', slot: 0 },
  { size: 14.7, tone: 'concrete', slot: 0.2 },
  { size: 20.3, tone: 'orange', slot: 0.4, split: 4, edges: true },
];

function MarketScale() {
  const hydrated = useHydrated();
  const { t, raw } = useT('landing');
  const names = raw<string[]>('market.names');
  return (
    <div className="bk-scale">
      <div className="bk-scale-stage">
        {hydrated
          ? <Suspense fallback={null}><PhysicsPlayground cubes={MARKET_CUBES} zoom={70} fitUnits={20.3} slots={5} dark className="bk-phys" label={t('market.physicsLabel')} /></Suspense>
          : null}
      </div>
      <div className="bk-scale-row">
        {MARKETS.map((m, i) => (
          <div key={m.value} className="bk-scale-col">
            <motion.span className="bk-scale-name" {...fadeUp(0.1 + i * 0.08)}>{names[i]}</motion.span>
            <motion.span className="bk-scale-val" {...fadeUp(0.2 + i * 0.08)}>{m.value}</motion.span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bridge() {
  const { t } = useT('landing');
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 40%'] });
  const draw = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const hangers: string[] = [];
  for (let x = 160; x <= 1040; x += 55) {
    const t = (x - 100) / 1000;
    const y = (1 - t) * (1 - t) * 210 + 2 * (1 - t) * t * 30 + t * t * 210;
    hangers.push(`M ${x} ${y.toFixed(1)} L ${x} 210`);
  }
  return (
    <div ref={ref} className="bk-bridge" aria-hidden="true">
      <svg viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid meet">
        {/* Left bank: the traditional world (solid blocks) */}
        <g className="bk-bridge-old">
          <rect x="0" y="120" width="34" height="90" /><rect x="40" y="80" width="26" height="130" /><rect x="72" y="140" width="30" height="70" />
        </g>
        {/* Right bank: the tokenized world (blueprint towers) */}
        <g className="bk-bridge-new">
          <path d="M1100 210 V90 H1126 V210 M1134 210 V40 H1158 V210 M1166 210 V120 H1196 V210" />
          <path d="M1100 120 H1126 M1100 150 H1126 M1134 80 H1158 M1134 120 H1158 M1134 160 H1158 M1166 150 H1196" />
        </g>
        <motion.path d="M 0 210 L 1200 210" className="bk-bridge-deck" style={{ pathLength: draw }} />
        <motion.path d="M 100 210 Q 600 30 1100 210" className="bk-bridge-arch" style={{ pathLength: draw }} />
        <motion.path d="M 100 218 Q 600 48 1100 218" className="bk-bridge-arch2" style={{ pathLength: draw }} />
        <motion.path d={hangers.join(' ')} className="bk-bridge-hangers" style={{ pathLength: draw }} />
        <path d="M 0 236 L 1200 236" className="bk-bridge-water" />
      </svg>
      <div className="bk-bridge-labels">
        <span>{t('bridge.oldLabel')}</span>
        <span>{t('bridge.newLabel')}</span>
      </div>
    </div>
  );
}

function InfinityLoop() {
  const { t } = useT('landing');
  const reduce = useReducedMotion();
  const PATH = 'M 300 150 C 380 40, 560 40, 560 150 C 560 260, 380 260, 300 150 C 220 40, 40 40, 40 150 C 40 260, 220 260, 300 150 Z';
  return (
    <div className="bk-inf">
      <svg viewBox="0 0 600 300" className="bk-inf-svg" aria-hidden="true">
        <path d={PATH} fill="none" stroke="rgba(13,11,51,0.08)" strokeWidth="14" />
        <motion.path d={PATH} fill="none" stroke="#1913B3" strokeWidth="1.6"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 2.4, ease: EASE }} />
        {!reduce && (
          <>
            <circle r="5" fill="#F0900F"><animateMotion dur="7s" repeatCount="indefinite" path={PATH} /></circle>
            <circle r="5" fill="#F0900F"><animateMotion dur="7s" begin="-3.5s" repeatCount="indefinite" path={PATH} /></circle>
          </>
        )}
      </svg>
      <div className="bk-inf-step bk-inf-l">
        <span className="bk-inf-n">{t('model.step1.n')}</span>
        <strong>{t('model.step1.title')}</strong>
        <span className="bk-inf-tag">B2B</span>
        <p>{t('model.step1.text')}</p>
      </div>
      <div className="bk-inf-step bk-inf-r">
        <span className="bk-inf-n">{t('model.step2.n')}</span>
        <strong>{t('model.step2.title')}</strong>
        <span className="bk-inf-tag">B2C</span>
        <p>{t('model.step2.text')}</p>
      </div>
    </div>
  );
}

function ContractFlow() {
  const { raw } = useT('landing');
  const steps = raw<string[]>('engine.flow');
  return (
    <ol className="bk-flow">
      {steps.map((s, i) => (
        <motion.li key={i} className="bk-spot" {...fadeUp(i * 0.15)}>
          <span className="bk-flow-n">{String(i + 1).padStart(2, '0')}</span>
          <span className="bk-flow-t">{s}</span>
        </motion.li>
      ))}
      <span className="bk-flow-pulse" aria-hidden="true" />
    </ol>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */

type BrikmeLandingProps = {
  onEnter: () => void;
  /** "Entrar dev" (no wallet). Passed only in dev builds running in demo mode. */
  onDevEnter?: () => void;
};

export default function BrikmeLanding({ onEnter, onDevEnter }: BrikmeLandingProps) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { t, raw } = useT('landing');
  const sep = t('format.thousands');
  const sectors: Sector[] = SECTOR_IMAGES.map(sec => ({ ...sec, ...raw<Text2>(`sectors.items.${sec.id}`) }));
  const sectorNames = sectors.map(sec => sec.t);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useMobile(900);
  const showMenu = menuOpen && isMobile;

  // ── Intro sequence (first load): loader ≥5 s until the car is ready → 2 s dark stage → lights on.
  const hydrated = useHydrated();
  const [introSkipped] = useState(() => introPlayed);
  const [minElapsed, setMinElapsed] = useState(false);
  const [carReady, setCarReady] = useState(false);
  const [carProgress, setCarProgress] = useState(0);
  const [lit, setLit] = useState(introSkipped);
  useEffect(() => { introPlayed = true; }, []);
  useEffect(() => {
    if (introSkipped) return undefined;
    const min = window.setTimeout(() => setMinElapsed(true), reduce ? 0 : LOADER_MIN_MS);
    const max = window.setTimeout(() => setCarReady(true), LOADER_MAX_MS); // never wait forever on a slow network
    return () => { window.clearTimeout(min); window.clearTimeout(max); };
  }, [introSkipped, reduce]);
  const loadingDone = introSkipped || (minElapsed && carReady);
  useEffect(() => {
    if (!loadingDone || lit) return undefined;
    const id = window.setTimeout(() => setLit(true), reduce ? 0 : DARK_MS);
    return () => window.clearTimeout(id);
  }, [loadingDone, lit, reduce]);
  const phase: IntroPhase = lit ? 'on' : loadingDone ? 'dark' : 'loading';
  const o = 0;

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const heroRef = useRef<HTMLElement>(null);
  // Carousel index is unbounded so it always turns the short way; the shown item is index mod N.
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroHold, setHeroHold] = useState(false);
  // The carousel holds still until its staged entrance has put every asset on stage.
  const [heroReady, setHeroReady] = useState(false);
  const heroN = HERO_ITEMS.length;
  const heroItem = HERO_ITEMS[((heroIdx % heroN) + heroN) % heroN];
  const heroPos = ((heroIdx % heroN) + heroN) % heroN;
  const jumpTo = (k: number): void => setHeroIdx(cur => {
    const at = ((cur % heroN) + heroN) % heroN;
    let d = k - at;
    if (d > heroN / 2) d -= heroN;
    if (d < -heroN / 2) d += heroN;
    return cur + d;
  });

  const ctaRef = useRef<HTMLElement>(null);
  const { scrollYProgress: ctaP } = useScroll({ target: ctaRef, offset: ['start end', 'end start'] });
  const ctaSkyY = useTransform(ctaP, [0, 1], ['-12%', '8%']);

  // Auto-advance the hero carousel unless the visitor is holding or hovering it.
  useEffect(() => {
    if (heroHold || reduce || phase !== 'on' || !heroReady) return undefined;
    const id = window.setInterval(() => setHeroIdx(x => x + 1), 5200);
    return () => window.clearInterval(id);
  }, [heroHold, reduce, phase, heroReady]);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const goSection = (e: MouseEvent<HTMLAnchorElement>, id: string): void => {
    e.preventDefault();
    setMenuOpen(false);
    scrollToId(id);
  };
  const goPage = (e: MouseEvent<HTMLAnchorElement>, href: string): void => {
    e.preventDefault();
    navigate(href);
  };
  const toMarket = () => navigate(MARKET_PATH);

  // Intro: shown on a fresh load (prerendered HTML included), skipped on in-app returns.

  // Cursor spotlight on any .bk-spot box.
  const onSpot = (e: MouseEvent<HTMLDivElement>): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.bk-spot');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div className="bk-page" onMouseMove={onSpot}>
      <AnimatePresence>{phase === 'loading' && <HeroLoader key="loader" done={minElapsed && carReady} progress={carReady ? 1 : carProgress} />}</AnimatePresence>
      <motion.div className="bk-progress" style={{ scaleX: progress }} aria-hidden="true" />

      {/* ─── NAV ───────────────────────────────────────────── */}
      <nav aria-label={t('nav.aria')} className={`bk-nav${scrolled || showMenu ? ' is-solid' : ''}`}>
        <a href="/" className="bk-nav-logo" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <img src={scrolled || showMenu ? '/logo-light.png' : '/logo-on-dark.png'} alt="BRIKME — Real World Tokenization" width={150} height={48} />
        </a>
        <div className="bk-nav-links">
          {NAV.map(id => <a key={id} href={`#${id}`} onClick={e => goSection(e, id)}>{t(`nav.items.${id}`)}</a>)}
        </div>
        <div className="bk-nav-cta">
          <LanguageSwitcher variant={scrolled || showMenu ? 'light' : 'dark'} />
          {onDevEnter && <button type="button" className="bk-dev" onClick={onDevEnter} title={t('nav.devTitle')}>{t('nav.dev')}</button>}
          <Btn href={LOGIN_PATH} onClick={onEnter} variant="line" arrow={false} className="bk-hide-sm">{t('nav.login')}</Btn>
          <Btn href={MARKET_PATH} onClick={toMarket} variant="solid" className="bk-hide-sm">{t('nav.invest')}</Btn>
          <button type="button" className="bk-burger" aria-label={showMenu ? t('nav.closeMenu') : t('nav.openMenu')} aria-expanded={showMenu} aria-controls="bk-menu"
            onClick={() => setMenuOpen(o => !o)}>
            <span className={showMenu ? 'is-open' : ''} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {showMenu && (
          <motion.div id="bk-menu" className="bk-menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {NAV.map((id, i) => (
              <motion.a key={id} href={`#${id}`} onClick={e => goSection(e, id)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                <span>{String(i + 1).padStart(2, '0')}</span>{t(`nav.items.${id}`)}
              </motion.a>
            ))}
            <div className="bk-menu-cta">
              <Btn href={MARKET_PATH} onClick={() => { setMenuOpen(false); toMarket(); }}>{t('nav.invest')}</Btn>
              <Btn href={LOGIN_PATH} onClick={() => { setMenuOpen(false); onEnter(); }} variant="line" arrow={false}>{t('nav.login')}</Btn>
              {onDevEnter && <button type="button" className="bk-dev" onClick={() => { setMenuOpen(false); onDevEnter(); }}>{t('nav.dev')}</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HERO: 3D carousel of real-world assets on a dark stage ─── */}
      <section ref={heroRef} className={`bk-hero3d${lit ? ' is-lit' : ''}`} onMouseEnter={() => setHeroHold(true)} onMouseLeave={() => setHeroHold(false)}>
        <div className="bk-hero3d-stage">
          {hydrated && (
            <Suspense fallback={null}>
              <HeroCarousel index={heroIdx} onIndex={setHeroIdx} onDragState={setHeroHold} className="bk-hero3d-canvas"
                lightsOn={lit} onCarReady={() => setCarReady(true)} onRevealed={() => setHeroReady(true)}
                onCarProgress={f => setCarProgress(prev => (f - prev >= 0.01 || f >= 1 ? f : prev))} />
            </Suspense>
          )}
        </div>
        <div className="bk-hero3d-top">
          <motion.div className="bk-badge bk-badge-dark" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + o, duration: 0.6 }}>
            <span className="bk-badge-dot" />{t('hero.badge')}
          </motion.div>
          <h1 className="bk-h1d">
            <Line delay={0.9} play={lit} className="bk-thin">{t('hero.titleThin')}</Line>
            <Line delay={1.05} play={lit}><strong>{t('hero.titleBold')}</strong></Line>
          </h1>
          <motion.p className="bk-lead-d" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + o, duration: 0.8 }}>
            {t('hero.lead')}
          </motion.p>
        </div>
        <motion.div className="bk-hero3d-bottom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 + o, duration: 0.8 }}>
          <div className="bk-hero3d-item" aria-live="polite">
            <span className="bk-hero3d-count">{String(heroPos + 1).padStart(2, '0')} / {String(heroN).padStart(2, '0')}</span>
            <AnimatePresence mode="wait">
              <motion.div key={heroItem.key} className="bk-hero3d-name" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}>
                <strong>{t(`hero.items.${heroItem.key}.title`)}</strong>
                <span>{t(`hero.items.${heroItem.key}.sub`)}</span>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="bk-hero3d-ctrl">
            <button type="button" className="bk-sq" aria-label={t('hero.prev')} disabled={!heroReady} onClick={() => setHeroIdx(x => x - 1)}><span className="rtl-flip">←</span></button>
            <ol className="bk-hero3d-dots">
              {HERO_ITEMS.map((it, k) => (
                <li key={it.key}><button type="button" className={k === heroPos ? 'is-on' : ''} aria-label={t(`hero.items.${it.key}.title`)} aria-current={k === heroPos} disabled={!heroReady} onClick={() => jumpTo(k)} /></li>
              ))}
            </ol>
            <button type="button" className="bk-sq" aria-label={t('hero.next')} disabled={!heroReady} onClick={() => setHeroIdx(x => x + 1)}><span className="rtl-flip">→</span></button>
          </div>
          <div className="bk-hero3d-ctas">
            <Btn href={MARKET_PATH} onClick={toMarket} variant="accent">{t('hero.explore')}</Btn>
            <Btn href="#modelo" onClick={() => scrollToId('modelo')} variant="ghost-light">{t('hero.tokenize')}</Btn>
          </div>
        </motion.div>
        <span className="bk-hint bk-hint-dark" aria-hidden="true">{t('hero.dragHint')}</span>
      </section>

      {/* ─── KEY FIGURES ───────────────────────────────────── */}
      <section className="bk-figures" aria-label={t('figures.aria')}>
        <div className="bk-wrap">
          <ul className="bk-stats">
            {HERO_STAT_VALUES.map((value, i) => (
              <li key={i}>
                <span className="bk-stat-v">{value}</span>
                <span className="bk-stat-l">{raw<string[]>('figures.stats')[i]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── GIANT TYPE (rides the scroll) ─────────────────── */}
      <GiantType rows={[
        { text: `${sectorNames.slice(0, 3).join(' · ')} · `, dir: 1, variant: 'thin' },
        { text: `${sectorNames.slice(3).join(' · ')} · `, dir: -1, variant: 'outline' },
      ]} />

      {/* ─── 01 VISIÓN: la evolución de la propiedad ───────── */}
      <section id="vision" className="bk-sec">
        <div className="bk-wrap">
          <Head index="01" kicker={t('vision.kicker')}
            thin={t('vision.thin')} bold={t('vision.bold')}
            sub={t('vision.sub')} />
          <Evolution />
          <motion.blockquote className="bk-quote" {...fadeUp(0.1)}>
            <Corners />
            <ScrollReveal baseOpacity={0.1} enableBlur baseRotation={2} blurStrength={5} containerClassName="bk-reveal" textClassName="bk-reveal-text">
              {t('vision.quote')}
            </ScrollReveal>
          </motion.blockquote>
        </div>
      </section>

      {/* ─── 02 MERCADO (dark band) ────────────────────────── */}
      <section id="mercado" className="bk-sec bk-dark">
        <div className="bk-blueprint bk-blueprint-dark" aria-hidden="true" />
        <div className="bk-wrap">
          <Head index="02" tone="dark" align="center" kicker={t('market.kicker')}
            thin={t('market.thin')} bold={t('market.bold')}
            sub={t('market.sub')} />
          <MarketScale />
          <motion.p className="bk-band" {...fadeUp(0.2)}>
            {t('market.band.lead')}<strong>{t('market.band.strong1')}</strong>{t('market.band.mid')}<strong>{t('market.band.strong2')}</strong>{t('market.band.end')}
          </motion.p>
        </div>
      </section>

      {/* ─── 03 ADOPCIÓN ───────────────────────────────────── */}
      <section className="bk-sec">
        <div className="bk-wrap">
          <Head index="03" kicker={t('adoption.kicker')}
            thin={t('adoption.thin')} bold={t('adoption.bold')} />
          <div className="bk-adopt">
            <div>
              <h3 className="bk-h3">{t('adoption.statesTitle')}</h3>
              <ul className="bk-cards">
                {raw<{ flag: string; text: string }[]>('adoption.states').map((s, i) => (
                  <motion.li key={i} className="bk-card bk-spot" {...fadeUp(i * 0.1)}>
                    <Corners />
                    <span className="bk-card-k">{s.flag}</span>
                    <span className="bk-card-v">{stateValues(sep)[i]}</span>
                    <span className="bk-card-d">{s.text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="bk-h3">{t('adoption.institutionsTitle')}</h3>
              <ul className="bk-inst">
                {INSTITUTIONS.map((name, i) => (
                  <motion.li key={name} {...fadeUp(i * 0.1)}>
                    <span className="bk-inst-name">{name}</span>
                    <span className="bk-inst-t">{raw<string[]>('adoption.institutions')[i]}</span>
                  </motion.li>
                ))}
              </ul>
              <motion.p className="bk-insight" {...fadeUp(0.3)}>
                <strong>{t('adoption.insightLabel')}</strong> {t('adoption.insight')}
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 04 EL PROBLEMA / LA SOLUCIÓN ──────────────────── */}
      <section className="bk-sec bk-sec-paper">
        <div className="bk-wrap">
          <Head index="04" kicker={t('compare.kicker')}
            thin={t('compare.thin')} bold={t('compare.bold')} />
          <div className="bk-compare" role="table" aria-label={t('compare.aria')}>
            <div className="bk-compare-head" role="row">
              <span role="columnheader" />
              <span role="columnheader">{t('compare.oldTitle')} <em>{t('compare.oldTag')}</em></span>
              <span role="columnheader">{t('compare.newTitle')} <em>{t('compare.newTag')}</em></span>
            </div>
            {raw<{ k: string; old: string; next: string }[]>('compare.rows').map((r, i) => (
              <motion.div key={i} className="bk-compare-row" role="row" {...fadeUp(i * 0.1)}>
                <span role="rowheader" className="bk-compare-k">{r.k}</span>
                <span role="cell" className="bk-compare-old">
                  <span>{r.old}</span>
                  <motion.i initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 0.8 }} transition={{ delay: 0.5 + i * 0.1, duration: 0.7, ease: EASE }} aria-hidden="true" />
                </span>
                <span role="cell" className="bk-compare-new">{r.next}</span>
              </motion.div>
            ))}
          </div>
          <div className="bk-statement">
            <ScrollReveal baseOpacity={0.1} enableBlur baseRotation={2} blurStrength={5} containerClassName="bk-reveal" textClassName="bk-reveal-text">
              {t('compare.statement')}
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── 05 EL PUENTE DIGITAL ──────────────────────────── */}
      <section className="bk-sec">
        <div className="bk-wrap">
          <Head index="05" kicker={t('bridge.kicker')} align="center"
            thin={t('bridge.thin')} bold={t('bridge.bold')}
            sub={t('bridge.sub')} />
          <Bridge />
          <ol className="bk-pillars">
            {raw<Text2[]>('bridge.pillars').map((p, i) => (
              <motion.li key={PILLAR_NUMBERS[i]} className="bk-spot" {...fadeUp(i * 0.12)}>
                <span className="bk-pillar-n">{PILLAR_NUMBERS[i]}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </motion.li>
            ))}
          </ol>
          <motion.p className="bk-tagline" {...fadeUp(0.2)}>{t('bridge.taglineLead')} <strong>{t('bridge.taglineStrong')}</strong></motion.p>
        </div>
      </section>

      {/* ─── CLUB: invest in the real (dark, 3D cube) ──────── */}
      <section className="bk-sec bk-dark">
        <div className="bk-wrap bk-club">
          <div className="bk-club-copy">
            <Head kicker={t('club.kicker')} tone="dark"
              thin={t('club.thin')} bold={t('club.bold')}
              sub={t('club.sub')} />
            <ul className="bk-club-facts">
              {CLUB_VALUES.map((v, i) => (
                <motion.li key={v} {...fadeUp(0.1 + i * 0.08)}>
                  <strong>{v}</strong>
                  <span>{raw<string[]>('club.facts')[i]}</span>
                </motion.li>
              ))}
            </ul>
            <motion.div {...fadeUp(0.3)}>
              <Btn href={MARKET_PATH} onClick={toMarket} variant="accent">{t('club.cta')}</Btn>
            </motion.div>
          </div>
          <motion.div className="bk-club-stage" {...fadeUp(0.15)}>
            <Corners />
            {hydrated ? <Suspense fallback={null}><Logo3D tone="dark" className="bk-club-3d" /></Suspense> : <BrikmeMark size={200} />}
            <span className="bk-club-hint" aria-hidden="true">{t('club.hint')}</span>
          </motion.div>
        </div>
      </section>

      {/* ─── 06 SECTORES ───────────────────────────────────── */}
      <section id="sectores" className="bk-sec bk-sec-paper">
        <div className="bk-wrap">
          <Head index="06" kicker={t('sectors.kicker')}
            thin={t('sectors.thin')} bold={t('sectors.bold')}
            sub={t('sectors.sub')} />
          <SectorExplorer sectors={sectors} exploreHref={MARKET_PATH} onExplore={toMarket} />
        </div>
      </section>

      {/* ─── 07 MOTOR: smart contracts + tipología ─────────── */}
      <section className="bk-sec">
        <div className="bk-wrap bk-engine">
          <div>
            <Head index="07" kicker={t('engine.kicker')}
              thin={t('engine.thin')} bold={t('engine.bold')}
              sub={t('engine.sub')} />
            <ContractFlow />
            <motion.div className="bk-seal" {...fadeUp(0.2)}>
              <Corners />
              <span className="bk-seal-k">{t('engine.sealLabel')}</span>
              {t('engine.sealText')} <strong>{t('engine.sealStrong')}</strong>
            </motion.div>
          </div>
          <div>
            <h3 className="bk-h3">{t('engine.tokensTitle')}</h3>
            <ul className="bk-tokens">
              {TOKENS.map((tok, i) => (
                <motion.li key={tok.id} className={`bk-spot${tok.focus ? ' is-focus' : ''}${tok.faint ? ' is-faint' : ''}`} {...fadeUp(i * 0.08)}>
                  <span className="bk-tok-t">{t(`engine.tokens.${tok.id}.t`)}</span>
                  <span className="bk-tok-d">{t(`engine.tokens.${tok.id}.d`)}</span>
                  <span className="bk-tok-ex">{t(`engine.tokens.${tok.id}.ex`)}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── 08 MODELO + CASO DUBÁI ────────────────────────── */}
      <section id="modelo" className="bk-sec bk-sec-paper">
        <div className="bk-wrap">
          <Head index="08" kicker={t('model.kicker')} align="center"
            thin={t('model.thin')} bold={t('model.bold')}
            sub={t('model.sub')} />
          <InfinityLoop />
          <div className="bk-fees">
            <motion.div className="bk-spot" {...fadeUp(0)}><span className="bk-fee-k">{t('model.setupFee')}</span><p>{t('model.setupText')}</p></motion.div>
            <motion.div className="bk-spot" {...fadeUp(0.1)}><span className="bk-fee-k">{t('model.successFee')}</span><p>{t('model.successText')}</p></motion.div>
            <motion.div className="bk-fees-cta" {...fadeUp(0.2)}>
              <Btn href={LOGIN_PATH} onClick={onEnter}>{t('model.cta')}</Btn>
            </motion.div>
          </div>

          <div className="bk-case">
            <motion.div className="bk-case-img bk-case-3d" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
              {hydrated && <Suspense fallback={null}><TokenBlock3D className="bk-token-3d" /></Suspense>}
              <span className="bk-hint bk-hint-case" aria-hidden="true">{t('model.caseHint')}</span>
              <motion.span className="bk-curtain bk-curtain-x" aria-hidden="true" variants={CURTAIN_X} transition={{ duration: 1.2, ease: [0.77, 0, 0.18, 1] }} />
              <div className="bk-case-tag"><span>{t('model.caseTag')}</span><strong>{t('model.caseName')}</strong><em>{t('model.caseAmount')}</em></div>
            </motion.div>
            <div className="bk-case-steps">
              <motion.div {...fadeUp(0.1)}>
                <span className="bk-case-k">{t('model.fractionTitle')}</span>
                <span className="bk-case-big"><CountUp to={40000} separator={sep} duration={2} /></span>
                <span className="bk-case-d">{t('model.fractionLead')}<strong>{t('model.fractionStrong')}</strong>{t('model.fractionEnd')}</span>
              </motion.div>
              <motion.div {...fadeUp(0.2)}>
                <span className="bk-case-k">{t('model.returnTitle')}</span>
                <div className="bk-bar"><span>{t('model.appreciation')}</span><b>{t('model.appreciationValue')}</b><i><motion.u initial={{ scaleX: 0 }} whileInView={{ scaleX: 0.75 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE, delay: 0.3 }} /></i></div>
                <div className="bk-bar"><span>{t('model.rent')}</span><b>{t('model.rentValue')}</b><i><motion.u className="is-orange" initial={{ scaleX: 0 }} whileInView={{ scaleX: 0.5 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE, delay: 0.45 }} /></i></div>
              </motion.div>
            </div>
          </div>
          <p className="bk-disclaimer">{t('model.disclaimer')}</p>
        </div>
      </section>

      {/* ─── 09 LIDERAZGO ──────────────────────────────────── */}
      <section id="liderazgo" className="bk-sec">
        <div className="bk-wrap bk-leader">
          <motion.figure className="bk-leader-photo" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
            <img src="/images/brikme/andres-ortiz-oficina.webp" alt={t('leader.photoAlt')} loading="lazy" width={1254} height={1254} />
            <motion.span className="bk-curtain bk-curtain-y" aria-hidden="true" variants={CURTAIN_Y} transition={{ duration: 1.2, ease: [0.77, 0, 0.18, 1] }} />
            <Corners />
          </motion.figure>
          <div>
            <Head index="09" kicker={t('leader.kicker')}
              thin="Andrés" bold="Ortiz."
              sub={t('leader.role')} />
            <ul className="bk-leader-pts">
              {raw<string[]>('leader.points').map((p, i) => <motion.li key={i} {...fadeUp(i * 0.1)}>{p}</motion.li>)}
            </ul>
            <motion.blockquote className="bk-leader-quote" {...fadeUp(0.3)}>{t('leader.quote')}</motion.blockquote>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL (dark band) ─────────────────────────── */}
      <section ref={ctaRef} id="contacto" className="bk-sec bk-dark bk-final">
        <div className="bk-final-sky" aria-hidden="true">
          <motion.img src="/images/brikme/dubai-skyline.webp" alt="" loading="lazy" style={{ y: reduce ? 0 : ctaSkyY }} width={2866} height={456} />
        </div>
        <Horizon progress={ctaP} />
        <div className="bk-wrap bk-final-in">
          <motion.div className="bk-final-mark" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE }}>
            <BrikmeMark size={64} stroke="#ffffff" />
          </motion.div>
          <ScrollReveal baseOpacity={0.12} enableBlur baseRotation={2} blurStrength={6} containerClassName="bk-reveal bk-final-h" textClassName="bk-reveal-text bk-thin">
            {t('final.statement')}
          </ScrollReveal>
          <BlurText text={t('final.strong')} animateBy="words" direction="bottom" delay={110} className="bk-final-strong" />
          <motion.div className="bk-final-ctas" {...fadeUp(0.4)}>
            <Btn href={MARKET_PATH} onClick={toMarket} variant="accent">{t('final.explore')}</Btn>
            <Btn href={LOGIN_PATH} onClick={onEnter} variant="ghost-light">{t('final.create')}</Btn>
          </motion.div>
          <motion.dl className="bk-contact" {...fadeUp(0.5)}>
            <div><dt>{t('final.email')}</dt><dd><a href="mailto:hello@brikme.com">hello@brikme.com</a></dd></div>
            <div><dt>{t('final.hq')}</dt><dd>{t('final.hqValue')}</dd></div>
            <div><dt>{t('final.web')}</dt><dd><a href="https://www.brikme.com" rel="noopener">www.brikme.com</a></dd></div>
          </motion.dl>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────── */}
      <footer className="bk-footer">
        <div className="bk-wrap bk-footer-in">
          <div className="bk-footer-brand">
            <img src="/logo-dark.png" alt="BRIKME — Real World Tokenization" width={160} height={51} loading="lazy" />
            <p>{t('footer.about')}</p>
          </div>
          <ul className="bk-footer-links">
            {FOOTER_LINKS.map(([key, href]) => <li key={href}><a href={href} onClick={e => goPage(e, href)}>{t(`links.${key}`)}</a></li>)}
          </ul>
        </div>
        <div className="bk-wrap bk-footer-legal">
          <span>© 2026 Brikme · Real World Tokenization</span>
          <span>{t('footer.risk')}</span>
        </div>
        <nav aria-label={t('links.siteAria')} className="sr-only">
          <ul>{SITE_LINKS.map(([key, href]) => <li key={href}><a href={href} onClick={e => goPage(e, href)}>{t(`links.${key}`)}</a></li>)}</ul>
        </nav>
      </footer>
    </div>
  );
}
