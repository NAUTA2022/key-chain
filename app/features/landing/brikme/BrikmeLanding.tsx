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
import SectorExplorer from './SectorExplorer';
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

const NAV: ReadonlyArray<readonly [label: string, id: string]> = [
  ['Visión', 'vision'], ['Mercado', 'mercado'], ['Sectores', 'sectores'], ['Modelo', 'modelo'], ['Liderazgo', 'liderazgo'], ['Contacto', 'contacto'],
];
// Public pages, listed for crawlers and screen readers.
const SITE_LINKS: ReadonlyArray<readonly [label: string, href: string]> = [
  ['Tokenizaciones', '/tokenizaciones'], ['Mercado secundario', '/mercado-secundario'], ['Academia', '/academia'], ['Centro de ayuda', '/ayuda'],
];
const FOOTER_LINKS: ReadonlyArray<readonly [label: string, href: string]> = [
  ['Proyectos', '/tokenizaciones'], ['Academia', '/academia'], ['Centro de ayuda', '/ayuda'], ['Términos', '/terminos'], ['Privacidad', '/privacidad'],
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

const HERO_STATS: ReadonlyArray<{ value: ReactNode; label: string }> = [
  { value: <>$<CountUp to={200} duration={1.6} /></>, label: 'USD de participación mínima' },
  { value: <><CountUp to={24} duration={1.6} />/7</>, label: 'Mercado global, sin horarios' },
  { value: <CountUp to={6} duration={1.6} />, label: 'Sectores de la economía real' },
  { value: 'VARA', label: 'Registrada y licenciada en Dubái' },
];

const EVOLUTION: ReadonlyArray<{ web: string; verb: string; desc: string; tone: 'concrete' | 'sand' | 'glass'; size: number; hint: string }> = [
  { web: 'Web 1', verb: 'Read', desc: 'Consumo de información.', tone: 'concrete', size: 150, hint: 'Arrástralo y suéltalo' },
  { web: 'Web 2', verb: 'Write', desc: 'Creación e interacción.', tone: 'sand', size: 190, hint: 'Arrástralo y suéltalo' },
  { web: 'Web 3', verb: 'Own', desc: 'Propiedad digital verificada.', tone: 'glass', size: 230, hint: 'Pasa el cursor encima' },
];

// Cube edge ∝ value^(1/3): the volumes are to scale (DeFi = 1 unit).
const MARKETS: ReadonlyArray<{ name: string; value: string; units: number; tone: CubeTone }> = [
  { name: 'DeFi', value: '$120B', units: 1, tone: 'navy' },
  { name: 'Criptomonedas', value: '$3.6T', units: 3.1, tone: 'steel' },
  { name: 'Mercado de valores', value: '$115T', units: 9.9, tone: 'sand' },
  { name: 'Inmobiliario global', value: '$380T', units: 14.7, tone: 'concrete' },
  { name: 'Derivados', value: '$1Q', units: 20.3, tone: 'glass' },
];

const STATES: ReadonlyArray<{ flag: string; value: ReactNode; text: string }> = [
  { flag: 'EE. UU.', value: <><CountUp to={328000} separator="." duration={2.2} /> BTC</>, text: 'Mayor reserva estatal del mundo.' },
  { flag: 'El Salvador', value: <><CountUp to={7500} separator="." duration={2} />+ BTC</>, text: 'Primer país con estrategia nacional de acumulación.' },
  { flag: 'Emiratos Árabes Unidos', value: <>$<CountUp to={16000} separator="." duration={2} />M</>, text: 'Tokenizados: apuesta estatal por el real estate en blockchain.' },
];

const INSTITUTIONS: ReadonlyArray<{ name: string; text: string }> = [
  { name: 'BlackRock', text: 'Su fondo tokenizado BUIDL alcanza los US$3 mil millones en activos administrados.' },
  { name: 'Fidelity', text: 'Lanzamiento del Fidelity Digital Dollar (FIDD) institucional.' },
  { name: 'Nasdaq', text: 'Asociación estratégica para lanzar acciones tokenizadas en 2027.' },
];

const COMPARE: ReadonlyArray<{ k: string; old: string; next: string }> = [
  { k: 'Barrera de entrada', old: 'US$100.000+ requeridos.', next: 'Participación desde US$200.' },
  { k: 'Liquidez', old: 'Capital bloqueado por meses o años.', next: 'Inmediata, mercados globales 24/7.' },
  { k: 'Fronteras', old: 'Restricciones locales y burocracia pesada.', next: 'Acceso digital sin fronteras geográficas.' },
  { k: 'Intermediarios', old: 'Bancos, notarios y comisiones altas.', next: 'Smart contracts con ejecución automática.' },
];

const PILLARS: ReadonlyArray<{ n: string; t: string; d: string }> = [
  { n: '01', t: 'Democratizamos el acceso', d: 'Participa en activos de alto valor desde US$200, con la misma información que un institucional.' },
  { n: '02', t: 'Generamos liquidez', d: 'Financiamos y fondeamos activos para desarrolladores donde la banca tradicional falla.' },
  { n: '03', t: 'Un club sin fronteras', d: 'Una comunidad de inversión global con la blockchain como columna vertebral.' },
];

// Photos: Unsplash (free licence), 1600×1067 WebP in public/images/brikme/sectors.
const SECTORS: ReadonlyArray<{ id: string; t: string; d: string; img: string }> = [
  { id: 'real-estate', t: 'Real Estate', d: 'Propiedades y hoteles', img: '/images/brikme/sectors/real-estate.webp' },
  { id: 'mineria', t: 'Minería', d: 'Activos físicos y extracción', img: '/images/brikme/sectors/mineria.webp' },
  { id: 'agricultura', t: 'Agricultura', d: 'Producción sostenible', img: '/images/brikme/sectors/agricultura.webp' },
  { id: 'energia', t: 'Energía', d: 'Infraestructura renovable', img: '/images/brikme/sectors/energia.webp' },
  { id: 'transporte', t: 'Transporte', d: 'Logística global', img: '/images/brikme/sectors/transporte.webp' },
  { id: 'lujo', t: 'Activos de lujo', d: 'Arte y coleccionables', img: '/images/brikme/sectors/lujo.webp' },
];

const CLUB_FACTS: ReadonlyArray<{ v: string; k: string }> = [
  { v: '$200', k: 'Inversión mínima en USD' },
  { v: '24/7', k: 'Liquidez global' },
  { v: '0', k: 'Fronteras para invertir' },
];

const TOKENS: ReadonlyArray<{ t: string; d: string; ex: string; focus?: boolean; faint?: boolean }> = [
  { t: 'Utility tokens', d: 'Acceso a servicios', ex: 'ETH · GT3 · FIT' },
  { t: 'Security / E-Money', d: 'Acciones, CBDCs', ex: 'Tokens de capital · CBDC' },
  { t: 'Stablecoins', d: 'Valor estable', ex: 'USDT · USDC · DAI' },
  { t: 'RWA — el enfoque Brikme', d: 'Activos del mundo real: valor capturado del mundo tradicional', ex: 'Inmuebles · Oro · Infraestructura', focus: true },
  { t: 'NFTs / Memecoins', d: 'Coleccionables, especulación', ex: 'Fuera de nuestro foco', faint: true },
];

const LEADER_POINTS = [
  '22 años de experiencia escalando negocios en tecnología y real estate.',
  'Miembro fundador del Colombian Business Council en Dubái (Cámara de Comercio de Dubái).',
  'Galardonado con el International Visionaries Award 2025 en Dubái.',
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
  return (
    <div className="bk-evo-x">
      <div className="bk-evo-stage">
        {hydrated
          ? <Suspense fallback={null}><PhysicsPlayground cubes={EVO_CUBES} zoom={92} className="bk-phys" label="Tres cubos en 3D con física: arrástralos, lánzalos y haz que choquen" /></Suspense>
          : null}
        <span className="bk-hint bk-hint-evo" aria-hidden="true">Agarra, lanza y apila los cubos</span>
      </div>
      <div className="bk-evo">
        {EVOLUTION.map((e, i) => (
          <motion.div key={e.web} className="bk-evo-col" {...fadeUp(i * 0.15)}>
            <div className="bk-evo-txt">
              <span className="bk-evo-web">{e.web}</span>
              <span className="bk-evo-verb">{e.verb}</span>
              <span className="bk-evo-desc">{e.desc}</span>
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
  return (
    <div className="bk-scale">
      <div className="bk-scale-stage">
        {hydrated
          ? <Suspense fallback={null}><PhysicsPlayground cubes={MARKET_CUBES} zoom={70} fitUnits={20.3} slots={5} dark className="bk-phys" label="Cubos a escala de cada mercado, con física: arrástralos y lánzalos" /></Suspense>
          : null}
      </div>
      <div className="bk-scale-row">
        {MARKETS.map((m, i) => (
          <div key={m.name} className="bk-scale-col">
            <motion.span className="bk-scale-name" {...fadeUp(0.1 + i * 0.08)}>{m.name}</motion.span>
            <motion.span className="bk-scale-val" {...fadeUp(0.2 + i * 0.08)}>{m.value}</motion.span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bridge() {
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
        <span>Capital tradicional</span>
        <span>Activos tokenizados</span>
      </div>
    </div>
  );
}

function InfinityLoop() {
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
        <span className="bk-inf-n">Paso 1</span>
        <strong>Originación</strong>
        <span className="bk-inf-tag">B2B</span>
        <p>Estructuración legal y tecnológica del activo físico.</p>
      </div>
      <div className="bk-inf-step bk-inf-r">
        <span className="bk-inf-n">Paso 2</span>
        <strong>Distribución</strong>
        <span className="bk-inf-tag">B2C</span>
        <p>Lanzamiento en el Marketplace Brikme a la red global de inversionistas.</p>
      </div>
    </div>
  );
}

function ContractFlow() {
  const steps = ['Condiciones cumplidas', 'Ejecución automática', 'Transacción registrada en el ledger'];
  return (
    <ol className="bk-flow">
      {steps.map((s, i) => (
        <motion.li key={s} className="bk-spot" {...fadeUp(i * 0.15)}>
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
      <nav aria-label="Principal" className={`bk-nav${scrolled || showMenu ? ' is-solid' : ''}`}>
        <a href="/" className="bk-nav-logo" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <img src={scrolled || showMenu ? '/logo-light.png' : '/logo-on-dark.png'} alt="BRIKME — Real World Tokenization" width={150} height={48} />
        </a>
        <div className="bk-nav-links">
          {NAV.map(([l, id]) => <a key={id} href={`#${id}`} onClick={e => goSection(e, id)}>{l}</a>)}
        </div>
        <div className="bk-nav-cta">
          {onDevEnter && <button type="button" className="bk-dev" onClick={onDevEnter} title="Entrar sin wallet (solo desarrollo)">Entrar dev</button>}
          <Btn href={LOGIN_PATH} onClick={onEnter} variant="line" arrow={false} className="bk-hide-sm">Iniciar sesión</Btn>
          <Btn href={MARKET_PATH} onClick={toMarket} variant="solid" className="bk-hide-sm">Invertir</Btn>
          <button type="button" className="bk-burger" aria-label={showMenu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={showMenu} aria-controls="bk-menu"
            onClick={() => setMenuOpen(o => !o)}>
            <span className={showMenu ? 'is-open' : ''} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {showMenu && (
          <motion.div id="bk-menu" className="bk-menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {NAV.map(([l, id], i) => (
              <motion.a key={id} href={`#${id}`} onClick={e => goSection(e, id)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                <span>{String(i + 1).padStart(2, '0')}</span>{l}
              </motion.a>
            ))}
            <div className="bk-menu-cta">
              <Btn href={MARKET_PATH} onClick={() => { setMenuOpen(false); toMarket(); }}>Invertir</Btn>
              <Btn href={LOGIN_PATH} onClick={() => { setMenuOpen(false); onEnter(); }} variant="line" arrow={false}>Iniciar sesión</Btn>
              {onDevEnter && <button type="button" className="bk-dev" onClick={() => { setMenuOpen(false); onDevEnter(); }}>Entrar dev</button>}
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
            <span className="bk-badge-dot" />Registrada y licenciada en Dubái · VARA
          </motion.div>
          <h1 className="bk-h1d">
            <Line delay={0.9} play={lit} className="bk-thin">Invierte en lo</Line>
            <Line delay={1.05} play={lit}><strong>extraordinario.</strong></Line>
          </h1>
          <motion.p className="bk-lead-d" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + o, duration: 0.8 }}>
            Activos reales tokenizados: de un superdeportivo a una torre en Dubái. Participa desde US$200.
          </motion.p>
        </div>
        <motion.div className="bk-hero3d-bottom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 + o, duration: 0.8 }}>
          <div className="bk-hero3d-item" aria-live="polite">
            <span className="bk-hero3d-count">{String(heroPos + 1).padStart(2, '0')} / {String(heroN).padStart(2, '0')}</span>
            <AnimatePresence mode="wait">
              <motion.div key={heroItem.key} className="bk-hero3d-name" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}>
                <strong>{heroItem.title}</strong>
                <span>{heroItem.sub}</span>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="bk-hero3d-ctrl">
            <button type="button" className="bk-sq" aria-label="Activo anterior" disabled={!heroReady} onClick={() => setHeroIdx(x => x - 1)}>←</button>
            <ol className="bk-hero3d-dots">
              {HERO_ITEMS.map((it, k) => (
                <li key={it.key}><button type="button" className={k === heroPos ? 'is-on' : ''} aria-label={it.title} aria-current={k === heroPos} disabled={!heroReady} onClick={() => jumpTo(k)} /></li>
              ))}
            </ol>
            <button type="button" className="bk-sq" aria-label="Activo siguiente" disabled={!heroReady} onClick={() => setHeroIdx(x => x + 1)}>→</button>
          </div>
          <div className="bk-hero3d-ctas">
            <Btn href={MARKET_PATH} onClick={toMarket} variant="accent">Explorar proyectos</Btn>
            <Btn href="#modelo" onClick={() => scrollToId('modelo')} variant="ghost-light">Tokeniza tu activo</Btn>
          </div>
        </motion.div>
        <span className="bk-hint bk-hint-dark" aria-hidden="true">Arrastra para girar</span>
      </section>

      {/* ─── KEY FIGURES ───────────────────────────────────── */}
      <section className="bk-figures" aria-label="Cifras clave">
        <div className="bk-wrap">
          <ul className="bk-stats">
            {HERO_STATS.map(st => (
              <li key={st.label}>
                <span className="bk-stat-v">{st.value}</span>
                <span className="bk-stat-l">{st.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── GIANT TYPE (rides the scroll) ─────────────────── */}
      <GiantType rows={[
        { text: 'Real Estate · Minería · Agricultura · ', dir: 1, variant: 'thin' },
        { text: 'Energía · Transporte · Activos de lujo · ', dir: -1, variant: 'outline' },
      ]} />

      {/* ─── 01 VISIÓN: la evolución de la propiedad ───────── */}
      <section id="vision" className="bk-sec">
        <div className="bk-wrap">
          <Head index="01" kicker="El cambio macro"
            thin="La evolución" bold="de la propiedad."
            sub="Leer, escribir… y ahora poseer. Internet entra en su tercera era." />
          <Evolution />
          <motion.blockquote className="bk-quote" {...fadeUp(0.1)}>
            <Corners />
            <ScrollReveal baseOpacity={0.1} enableBlur baseRotation={2} blurStrength={5} containerClassName="bk-reveal" textClassName="bk-reveal-text">
              Los activos y el dinero se están desmaterializando. Los tokens implican, por primera vez en la historia de internet, PROPIEDAD.
            </ScrollReveal>
          </motion.blockquote>
        </div>
      </section>

      {/* ─── 02 MERCADO (dark band) ────────────────────────── */}
      <section id="mercado" className="bk-sec bk-dark">
        <div className="bk-blueprint bk-blueprint-dark" aria-hidden="true" />
        <div className="bk-wrap">
          <Head index="02" tone="dark" align="center" kicker="La oportunidad"
            thin="¿Una oportunidad 100 veces" bold="más grande que Bitcoin?"
            sub="Cada cubo está a escala: su volumen es el tamaño de cada mercado." />
          <MarketScale />
          <motion.p className="bk-band" {...fadeUp(0.2)}>
            El mercado global de tokenización de RWA proyecta alcanzar los <strong>US$24 mil millones en 2025</strong>, creciendo a un <strong>CAGR del 22,7 %</strong> hasta 2030.
          </motion.p>
        </div>
      </section>

      {/* ─── 03 ADOPCIÓN ───────────────────────────────────── */}
      <section className="bk-sec">
        <div className="bk-wrap">
          <Head index="03" kicker="Adopción institucional y estatal"
            thin="Los gigantes ya están" bold="construyendo la plomería." />
          <div className="bk-adopt">
            <div>
              <h3 className="bk-h3">Movimientos estatales</h3>
              <ul className="bk-cards">
                {STATES.map((s, i) => (
                  <motion.li key={s.flag} className="bk-card bk-spot" {...fadeUp(i * 0.1)}>
                    <Corners />
                    <span className="bk-card-k">{s.flag}</span>
                    <span className="bk-card-v">{s.value}</span>
                    <span className="bk-card-d">{s.text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="bk-h3">El movimiento institucional</h3>
              <ul className="bk-inst">
                {INSTITUTIONS.map((s, i) => (
                  <motion.li key={s.name} {...fadeUp(i * 0.1)}>
                    <span className="bk-inst-name">{s.name}</span>
                    <span className="bk-inst-t">{s.text}</span>
                  </motion.li>
                ))}
              </ul>
              <motion.p className="bk-insight" {...fadeUp(0.3)}>
                <strong>Insight.</strong> Si no puedes con tu enemigo, únete a él: los gigantes ya construyen la infraestructura financiera de la próxima década.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 04 EL PROBLEMA / LA SOLUCIÓN ──────────────────── */}
      <section className="bk-sec bk-sec-paper">
        <div className="bk-wrap">
          <Head index="04" kicker="La problemática vs. la solución"
            thin="Del viejo mundo" bold="a la nueva era." />
          <div className="bk-compare" role="table" aria-label="Inversión tradicional frente a inversión tokenizada">
            <div className="bk-compare-head" role="row">
              <span role="columnheader" />
              <span role="columnheader">El viejo mundo <em>Tradicional</em></span>
              <span role="columnheader">La nueva era <em>Tokenizado</em></span>
            </div>
            {COMPARE.map((r, i) => (
              <motion.div key={r.k} className="bk-compare-row" role="row" {...fadeUp(i * 0.1)}>
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
              Mientras las grandes instituciones construyen piscinas privadas de liquidez para billonarios, el inversionista retail y el emprendedor siguen bloqueados.
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── 05 EL PUENTE DIGITAL ──────────────────────────── */}
      <section className="bk-sec">
        <div className="bk-wrap">
          <Head index="05" kicker="Presentamos Brikme" align="center"
            thin="El puente" bold="digital."
            sub="La primera comunidad y marketplace DeFi de activos del mundo real (RWA)." />
          <Bridge />
          <ol className="bk-pillars">
            {PILLARS.map((p, i) => (
              <motion.li key={p.n} className="bk-spot" {...fadeUp(i * 0.12)}>
                <span className="bk-pillar-n">{p.n}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </motion.li>
            ))}
          </ol>
          <motion.p className="bk-tagline" {...fadeUp(0.2)}>Todo en un único marketplace. <strong>Confiable, transparente y global.</strong></motion.p>
        </div>
      </section>

      {/* ─── CLUB: invest in the real (dark, 3D cube) ──────── */}
      <section className="bk-sec bk-dark">
        <div className="bk-wrap bk-club">
          <div className="bk-club-copy">
            <Head kicker="Club de inversión sin fronteras" tone="dark"
              thin="Invierte en" bold="lo real."
              sub="Cada token es un ladrillo de un activo real, registrado en blockchain y respaldado por un contrato. Construye tu portafolio pieza por pieza." />
            <ul className="bk-club-facts">
              {CLUB_FACTS.map((f, i) => (
                <motion.li key={f.k} {...fadeUp(0.1 + i * 0.08)}>
                  <strong>{f.v}</strong>
                  <span>{f.k}</span>
                </motion.li>
              ))}
            </ul>
            <motion.div {...fadeUp(0.3)}>
              <Btn href={MARKET_PATH} onClick={toMarket} variant="accent">Empezar a invertir</Btn>
            </motion.div>
          </div>
          <motion.div className="bk-club-stage" {...fadeUp(0.15)}>
            <Corners />
            {hydrated ? <Suspense fallback={null}><Logo3D tone="dark" className="bk-club-3d" /></Suspense> : <BrikmeMark size={200} />}
            <span className="bk-club-hint" aria-hidden="true">Arrastra para girar</span>
          </motion.div>
        </div>
      </section>

      {/* ─── 06 SECTORES ───────────────────────────────────── */}
      <section id="sectores" className="bk-sec bk-sec-paper">
        <div className="bk-wrap">
          <Head index="06" kicker="Sectores de la economía real"
            thin="Activos tangibles," bold="no especulación."
            sub="Respaldados por activos reales: diversificación y trazabilidad legal en cada proyecto." />
          <SectorExplorer sectors={SECTORS} exploreHref={MARKET_PATH} onExplore={toMarket} />
        </div>
      </section>

      {/* ─── 07 MOTOR: smart contracts + tipología ─────────── */}
      <section className="bk-sec">
        <div className="bk-wrap bk-engine">
          <div>
            <Head index="07" kicker="El motor Brikme"
              thin="Smart" bold="contracts."
              sub="Ejecución automática sin intermediarios. Transparente, inmutable y auditable por cualquier persona en el mundo." />
            <ContractFlow />
            <motion.div className="bk-seal" {...fadeUp(0.2)}>
              <Corners />
              <span className="bk-seal-k">Cumplimiento</span>
              Registrada y licenciada en Dubái <strong>(VARA compliant)</strong>
            </motion.div>
          </div>
          <div>
            <h3 className="bk-h3">Jerarquía y tipología de tokens</h3>
            <ul className="bk-tokens">
              {TOKENS.map((t, i) => (
                <motion.li key={t.t} className={`bk-spot${t.focus ? ' is-focus' : ''}${t.faint ? ' is-faint' : ''}`} {...fadeUp(i * 0.08)}>
                  <span className="bk-tok-t">{t.t}</span>
                  <span className="bk-tok-d">{t.d}</span>
                  <span className="bk-tok-ex">{t.ex}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── 08 MODELO + CASO DUBÁI ────────────────────────── */}
      <section id="modelo" className="bk-sec bk-sec-paper">
        <div className="bk-wrap">
          <Head index="08" kicker="Para desarrolladores y dueños de activos" align="center"
            thin="Un modelo híbrido" bold="y escalable."
            sub="La entrada de mejores activos atrae más liquidez, y más liquidez atrae activos institucionales de mayor grado." />
          <InfinityLoop />
          <div className="bk-fees">
            <motion.div className="bk-spot" {...fadeUp(0)}><span className="bk-fee-k">Setup fee</span><p>Curaduría, análisis y digitalización del activo con smart contracts.</p></motion.div>
            <motion.div className="bk-spot" {...fadeUp(0.1)}><span className="bk-fee-k">Success fee</span><p>Comisión sobre el fondeo exitoso de tu proyecto en el marketplace.</p></motion.div>
            <motion.div className="bk-fees-cta" {...fadeUp(0.2)}>
              <Btn href={LOGIN_PATH} onClick={onEnter}>Tokeniza tu activo</Btn>
            </motion.div>
          </div>

          <div className="bk-case">
            <motion.div className="bk-case-img bk-case-3d" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
              {hydrated && <Suspense fallback={null}><TokenBlock3D className="bk-token-3d" /></Suspense>}
              <span className="bk-hint bk-hint-case" aria-hidden="true">Pasa el cursor: 1 activo → 40.000 tokens</span>
              <motion.span className="bk-curtain bk-curtain-x" aria-hidden="true" variants={CURTAIN_X} transition={{ duration: 1.2, ease: [0.77, 0, 0.18, 1] }} />
              <div className="bk-case-tag"><span>Caso de éxito</span><strong>Proyecto Dubái</strong><em>US$40 millones</em></div>
            </motion.div>
            <div className="bk-case-steps">
              <motion.div {...fadeUp(0.1)}>
                <span className="bk-case-k">La fracción</span>
                <span className="bk-case-big"><CountUp to={40000} separator="." duration={2} /></span>
                <span className="bk-case-d">tokens emitidos a <strong>US$1.000</strong> cada uno</span>
              </motion.div>
              <motion.div {...fadeUp(0.2)}>
                <span className="bk-case-k">El retorno al inversionista</span>
                <div className="bk-bar"><span>Valorización proyectada</span><b>15% anual</b><i><motion.u initial={{ scaleX: 0 }} whileInView={{ scaleX: 0.75 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE, delay: 0.3 }} /></i></div>
                <div className="bk-bar"><span>Ingresos por renta</span><b>10% anual</b><i><motion.u className="is-orange" initial={{ scaleX: 0 }} whileInView={{ scaleX: 0.5 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE, delay: 0.45 }} /></i></div>
              </motion.div>
            </div>
          </div>
          <p className="bk-disclaimer">Cifras proyectadas del caso de estudio; no constituyen garantía de rendimientos futuros.</p>
        </div>
      </section>

      {/* ─── 09 LIDERAZGO ──────────────────────────────────── */}
      <section id="liderazgo" className="bk-sec">
        <div className="bk-wrap bk-leader">
          <motion.figure className="bk-leader-photo" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
            <img src="/images/brikme/andres-ortiz-oficina.webp" alt="Andrés Ortiz, CEO y fundador de Brikme, en su oficina" loading="lazy" width={1254} height={1254} />
            <motion.span className="bk-curtain bk-curtain-y" aria-hidden="true" variants={CURTAIN_Y} transition={{ duration: 1.2, ease: [0.77, 0, 0.18, 1] }} />
            <Corners />
          </motion.figure>
          <div>
            <Head index="09" kicker="Liderazgo y ejecución"
              thin="Andrés" bold="Ortiz."
              sub="CEO & Founder" />
            <ul className="bk-leader-pts">
              {LEADER_POINTS.map((p, i) => <motion.li key={p} {...fadeUp(i * 0.1)}>{p}</motion.li>)}
            </ul>
            <motion.blockquote className="bk-leader-quote" {...fadeUp(0.3)}>“La visión institucional requiere una ejecución inquebrantable.”</motion.blockquote>
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
            Por primera vez en la historia, la riqueza global no pertenece solo a las instituciones.
          </ScrollReveal>
          <BlurText text="Asegura tu lugar en el futuro del capital." animateBy="words" direction="bottom" delay={110} className="bk-final-strong" />
          <motion.div className="bk-final-ctas" {...fadeUp(0.4)}>
            <Btn href={MARKET_PATH} onClick={toMarket} variant="accent">Explorar proyectos</Btn>
            <Btn href={LOGIN_PATH} onClick={onEnter} variant="ghost-light">Crear mi cuenta</Btn>
          </motion.div>
          <motion.dl className="bk-contact" {...fadeUp(0.5)}>
            <div><dt>Email</dt><dd><a href="mailto:hello@brikme.com">hello@brikme.com</a></dd></div>
            <div><dt>Sede</dt><dd>Zlafa Building, Al Garhoud Office M02, Business Bay Bridge, Dubái — EAU</dd></div>
            <div><dt>Web</dt><dd><a href="https://www.brikme.com" rel="noopener">www.brikme.com</a></dd></div>
          </motion.dl>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────── */}
      <footer className="bk-footer">
        <div className="bk-wrap bk-footer-in">
          <div className="bk-footer-brand">
            <img src="/logo-dark.png" alt="BRIKME — Real World Tokenization" width={160} height={51} loading="lazy" />
            <p>Marketplace de activos del mundo real tokenizados. Registrada y licenciada en Dubái (VARA).</p>
          </div>
          <ul className="bk-footer-links">
            {FOOTER_LINKS.map(([l, href]) => <li key={href}><a href={href} onClick={e => goPage(e, href)}>{l}</a></li>)}
          </ul>
        </div>
        <div className="bk-wrap bk-footer-legal">
          <span>© 2026 Brikme · Real World Tokenization</span>
          <span>Invertir en activos tokenizados implica riesgos. Los rendimientos proyectados no garantizan resultados futuros.</span>
        </div>
        <nav aria-label="Páginas de Brikme" className="sr-only">
          <ul>{SITE_LINKS.map(([l, href]) => <li key={href}><a href={href} onClick={e => goPage(e, href)}>{l}</a></li>)}</ul>
        </nav>
      </footer>
    </div>
  );
}
