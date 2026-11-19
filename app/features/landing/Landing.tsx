import { useState, useEffect, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { Icons } from '~/components/ui';
import StrategySimulator from '~/features/landing/StrategySimulator';
import { RWA_ASSETS } from '~/data';
import { useMobile } from '~/hooks/useMobile';
// React Bits (https://reactbits.dev), kept restrained: word reveals, a soft shine
// on labels, counters and a sparse particle field behind the hero.
import LogoLoop, { type LogoItem } from '~/components/reactbits/LogoLoop';
import BlurText from '~/components/reactbits/BlurText';
import ShinyText from '~/components/reactbits/ShinyText';
import ScrollReveal from '~/components/reactbits/ScrollReveal';
import CountUp from '~/components/reactbits/CountUp';
import Particles from '~/components/reactbits/Particles';
import PhoneShowcase from '~/features/landing/PhoneShowcase';
import './Landing.css';

// La 33 landing — sober, editorial dark design: hairlines, pill labels,
// white→grey headings, orange only as the action color.

type HowStep = { n: string; t: string; d: string };

const HOW: HowStep[] = [
  { n: '01', t: 'Verifica tu identidad', d: 'KYC y AML en minutos: cédula o pasaporte y una selfie.' },
  { n: '02', t: 'Elige un proyecto',     d: 'Explora inmuebles, agro, energía e infraestructura de distintos originadores.' },
  { n: '03', t: 'Compra tokens',         d: 'Adquiere fracciones del activo desde tu wallet, en USDC.' },
  { n: '04', t: 'Cobra rendimientos',    d: 'Distribuciones periódicas en USDC directo a tu wallet.' },
];

type Benefit = { label: string; title: string; desc: string; icon: ReactNode };
const BENEFITS: readonly Benefit[] = [
  { label: 'Seguridad',    title: 'Contratos auditados',        desc: 'Smart contracts revisados antes de cada emisión, con reglas de KYC embebidas.', icon: Icons.shield },
  { label: 'Respaldo',     title: 'Activos tangibles reales',   desc: 'Cada token está respaldado por un activo físico con custodia y documentación verificable.', icon: Icons.doc },
  { label: 'Rendimiento',  title: 'Distribuciones en USDC',     desc: 'Las rentas del activo llegan on-chain a los inversionistas, sin intermediarios y auditables.', icon: Icons.receive },
  { label: 'Liquidez',     title: 'Mercado secundario',         desc: 'Los inversionistas pueden vender sus tokens a otros usuarios verificados del marketplace.', icon: Icons.swap },
  { label: 'Marketplace',  title: 'Muchos proyectos, un lugar', desc: 'Originadores de toda la región publican sus emisiones en un solo marketplace.', icon: Icons.primary },
  { label: 'Cumplimiento', title: 'KYC / AML institucional',    desc: 'Onboarding verificado para empresas e inversionistas, pensado para el marco panameño.', icon: Icons.lock },
];

const FAQ: ReadonlyArray<readonly [q: string, a: string]> = [
  ['¿Qué activos se pueden tokenizar con La 33?', 'Activos tangibles con valor y documentación verificable: inmuebles, fincas y producción agrícola, flotas, maquinaria, proyectos de energía e infraestructura. Cada caso pasa por un diagnóstico antes de avanzar.'],
  ['¿Cuánto tarda una emisión?', 'Depende del activo y de su documentación. El proceso cubre diagnóstico, estructuración legal y financiera, emisión on-chain y publicación en el marketplace; te damos un cronograma al cerrar el diagnóstico.'],
  ['¿Quién puede invertir en los proyectos?', 'Inversionistas que completan la verificación KYC / AML de la plataforma. Cada emisión define sus propios requisitos y ticket mínimo.'],
  ['¿Cómo se pagan los rendimientos?', 'Las rentas del activo se distribuyen on-chain en USDC directamente a la wallet de cada inversionista, de forma proporcional a sus tokens.'],
  ['¿Puedo vender mis tokens antes del plazo?', 'Sí, en el mercado secundario, a otros usuarios verificados. El precio lo acuerdan comprador y vendedor; la plataforma muestra el valor de referencia del token.'],
];

// Blockchain networks the platform runs on
const CHAIN_LOGOS: LogoItem[] = ([
  ['Polygon', '/crypto/matic.svg'], ['BNB Smart Chain', '/crypto/bnb.svg'], ['Celo', '/crypto/celo.png'], ['USDC', '/crypto/usdc.svg'],
] as const).map(([title, src]) => ({
  node: (
    <span className="lp-logo">
      <img src={src} alt="" width={24} height={24} />
      {title}
    </span>
  ),
  title,
}));

const REAL_ASSETS = RWA_ASSETS.filter(a => a.img && !a.name.startsWith('[QA]'));
const HERO_PARTICLES = ['#ffffff', '#a1a1aa', '#d4d4d8'];
/** [value, suffix, label] — counted up when they scroll into view. */
const FIGURES: ReadonlyArray<readonly [number, string, string]> = [
  [RWA_ASSETS.length, '', 'Proyectos en el marketplace'],
  [new Set(RWA_ASSETS.map(a => a.cat)).size, '', 'Sectores de activos'],
  [4, '', 'Modelos de tokenización'],
  [100, '%', 'Liquidación on-chain en USDC'],
];
const PROJECTS = REAL_ASSETS.slice(0, 8);
const showcaseAssets = REAL_ASSETS.slice(0, 3);

// In-page sections (real anchors, smooth-scrolled).
const NAV_LINKS: ReadonlyArray<readonly [label: string, id: string]> = [['Soluciones', 'soluciones'], ['Beneficios', 'beneficios'], ['Marketplace', 'como'], ['Proyectos', 'proyectos'], ['FAQ', 'faq']];
const SITE_LINKS: ReadonlyArray<readonly [label: string, href: string]> = [
  ['Tokenizaciones', '/tokenizaciones'], ['Mercado secundario', '/mercado-secundario'], ['Academia', '/academia'], ['Centro de ayuda', '/ayuda'],
];
const LEGAL_LINKS: ReadonlyArray<readonly [label: string, href: string]> = [['Términos', '/terminos'], ['Privacidad', '/privacidad'], ['Contacto', '/ayuda']];
const LOGIN_PATH = '/ingresar';

// "Entrar dev" — skips the wallet login (see lib/devSession). Dashed amber so
// it never gets mistaken for the real "Iniciar sesión" button.
const DEV_BTN: CSSProperties = {
  padding: '0 14px', fontSize: 13, fontFamily: 'var(--font-b)', fontWeight: 600, borderRadius: 10, cursor: 'pointer', height: 36,
  background: 'transparent', color: '#ffc94d', border: '1px dashed rgba(255,184,0,0.5)',
};

const scrollToId = (id: string): void => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const },
};

/** Small rounded label above a title: "● Beneficios". */
function Pill({ text }: { text: string }) {
  return (
    <span className="lp-pill"><span className="lp-pill-dot" aria-hidden="true" />
      <ShinyText text={text} speed={3.2} color="rgba(255,255,255,0.62)" shineColor="#ffffff" className="lp-shiny" />
    </span>
  );
}

/** Title lines revealed word by word; later lines a shade dimmer. */
function RevealLines({ lines }: { lines: readonly string[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <BlurText key={l} text={l} animateBy="words" direction="bottom" delay={60} stepDuration={0.32}
          className={`lp-bt${i > 0 ? ' dim' : ''}`} />
      ))}
    </>
  );
}

type SectionHeadProps = { pill: string; title: readonly string[]; sub?: string; center?: boolean };

function SectionHead({ pill, title, sub, center }: SectionHeadProps) {
  return (
    <motion.div {...reveal} className={`lp-head${center ? ' center' : ''}`}>
      <Pill text={pill} />
      <h2 className="lp-h2 lp-h2-bt"><RevealLines lines={title} /></h2>
      {sub && <p className="lp-sub">{sub}</p>}
    </motion.div>
  );
}

// One button style for the whole landing. With `href` it renders a real link
// (crawlable) and `onClick` handles the in-app navigation.
type LBtnProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
};

function LBtn({ children, onClick, href, variant = 'primary', size = 'md', block }: LBtnProps) {
  const cls = `lbtn lbtn-${variant} lbtn-${size}${block ? ' lbtn-block' : ''}`;
  const inner = <>{children}{variant === 'primary' && <span className="lbtn-arrow" aria-hidden="true">↗</span>}</>;
  if (href) {
    return <a href={href} className={cls} onClick={e => { e.preventDefault(); onClick?.(); }}>{inner}</a>;
  }
  return <button type="button" className={cls} onClick={onClick}>{inner}</button>;
}

// ─── Soluciones: one panel, two audiences (tabs), each told as a process ───
type Solution = {
  id: 'empresas' | 'marketplace';
  tab: string;
  title: string;
  text: string;
  facts: ReadonlyArray<readonly [label: string, value: string]>;
  steps: ReadonlyArray<readonly [title: string, desc: string]>;
  cta: string;
};

const SOLUTIONS: readonly Solution[] = [
  {
    id: 'empresas', tab: 'Para empresas',
    title: 'Tokeniza tus activos tangibles',
    text: 'Convierte inmuebles, fincas, flotas, maquinaria o proyectos de energía en tokens digitales. Te acompañamos de punta a punta desde Panamá.',
    facts: [['Sede', 'Panamá'], ['Modelo', 'B2B'], ['Red', 'Polygon'], ['Liquidación', 'USDC']],
    steps: [
      ['Diagnóstico del activo', 'Revisamos documentación, valuación y viabilidad de la emisión.'],
      ['Estructuración legal y financiera', 'Definimos el vehículo en Panamá, el modelo de retorno y los términos.'],
      ['Emisión on-chain', 'Creamos los tokens con smart contracts auditados y reglas KYC / AML.'],
      ['Publicación y distribución', 'Tu emisión llega al marketplace y los rendimientos se pagan en USDC.'],
    ],
    cta: 'Tokenizar mi activo',
  },
  {
    id: 'marketplace', tab: 'Marketplace',
    title: 'Un marketplace de tokenización',
    text: 'La 33 conecta muchos proyectos de tokenización con inversionistas verificados de la región, en un solo lugar.',
    facts: [['Originadores', 'Multi-proyecto'], ['Inversionistas', 'Verificados'], ['Sectores', 'Multi-industria'], ['Liquidez', 'Secundario']],
    steps: [
      ['Originadores publican', 'Empresas y plataformas aliadas listan sus emisiones en una vitrina común.'],
      ['Inversionistas verificados', 'Cada usuario pasa KYC / AML antes de comprar su primer token.'],
      ['Rendimientos automáticos', 'Las rentas de cada activo se distribuyen on-chain en USDC.'],
      ['Mercado secundario', 'Los tokens se pueden vender a otros usuarios verificados.'],
    ],
    cta: 'Ver proyectos',
  },
];

function Solutions({ cta }: { cta: (s: Solution) => ReactNode }) {
  const [tab, setTab] = useState(0);
  const s = SOLUTIONS[tab];
  return (
    <div className="sol">
      <div className="sol-tabs" role="tablist" aria-label="Soluciones">
        {SOLUTIONS.map((x, i) => (
          <button key={x.id} id={`sol-tab-${x.id}`} role="tab" aria-selected={i === tab} aria-controls="sol-panel"
            className={`sol-tab${i === tab ? ' on' : ''}`} onClick={() => setTab(i)}>{x.tab}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={s.id} id="sol-panel" role="tabpanel" aria-labelledby={`sol-tab-${s.id}`} className="sol-panel"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          <div className="sol-intro">
            <h3 className="sol-title">{s.title}</h3>
            <p className="sol-text">{s.text}</p>
            <dl className="sol-facts">
              {s.facts.map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}
            </dl>
            {cta(s)}
          </div>
          <ol className="sol-steps">
            {s.steps.map(([t, d], i) => (
              <li key={t}>
                <span className="sol-num">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div className="sol-step-t">{t}</div>
                  <div className="sol-step-d">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq">
      {FAQ.map(([q, a], i) => {
        const on = open === i;
        return (
          <div key={q} className={`faq-item${on ? ' on' : ''}`}>
            <button type="button" className="faq-q" aria-expanded={on} aria-controls={`faq-a-${i}`} onClick={() => setOpen(on ? -1 : i)}>
              <span>{q}</span>
              <span className="faq-ico" aria-hidden="true">{on ? '−' : '+'}</span>
            </button>
            <AnimatePresence initial={false}>
              {on && (
                <motion.div id={`faq-a-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                  <p className="faq-a">{a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

const STEP_MS = 5200;

type LandingProps = {
  onEnter: () => void;
  /** "Entrar dev" (no wallet). The route passes it only when lib/devSession allows it (dev build + demo mode). */
  onDevEnter?: () => void;
};

export default function Landing({ onEnter, onDevEnter }: LandingProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useMobile(768);
  const [activeStep, setActiveStep] = useState(0);
  const [stepsPaused, setStepsPaused] = useState(false);
  useEffect(() => {
    if (stepsPaused) return undefined;
    const id = setTimeout(() => setActiveStep(s => (s + 1) % HOW.length), STEP_MS);
    return () => clearTimeout(id);
  }, [activeStep, stepsPaused]);
  // The mobile menu only exists below the breakpoint (widening the window closes it).
  const showMenu = menuOpen && isMobile;

  const goSection = (e: MouseEvent<HTMLAnchorElement>, id: string): void => { e.preventDefault(); scrollToId(id); };
  const goPage = (e: MouseEvent<HTMLAnchorElement>, href: string): void => { e.preventDefault(); navigate(href); };

  return (
    <div className="lp">

      {/* ─── NAV ─────────────────────────────────────────────── */}
      <nav aria-label="Principal" className="land-nav lp-nav">
        <a href="/" aria-label="La 33, inicio" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="lp-brand">
          <img src="/la33/la33-wordmark-dark.webp" alt="La 33" width={118} height={24} />
        </a>
        <div className="land-nav-links lp-links">
          {NAV_LINKS.map(([l, id]) => (
            <a key={l} href={`#${id}`} onClick={e => goSection(e, id)} className="lp-link">{l}</a>
          ))}
        </div>
        <div className="lp-nav-right">
          <div className="land-nav-links lp-nav-actions">
            {onDevEnter && <button type="button" onClick={onDevEnter} title="Entrar sin wallet (solo desarrollo)" style={DEV_BTN}>Entrar dev</button>}
            <a href={LOGIN_PATH} onClick={e => { e.preventDefault(); onEnter(); }} className="lp-link">Iniciar sesión</a>
            <LBtn size="sm" href={LOGIN_PATH} onClick={onEnter}>Empezar</LBtn>
          </div>
          <button className="land-hamburger lp-burger" aria-label={showMenu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={showMenu} aria-controls="land-mobile-menu"
            onClick={() => setMenuOpen(o => !o)}>
            {[0, 1, 2].map(i => (
              <motion.span key={i} initial={false}
                animate={showMenu ? (i === 1 ? { opacity: 0 } : { y: i === 0 ? 6 : -6, rotate: i === 0 ? 45 : -45 }) : { opacity: 1, y: 0, rotate: 0 }}
                style={{ position: 'absolute', left: 10, top: 12 + i * 6, width: 16, height: 1.5, borderRadius: 2, background: 'currentColor' }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div id="land-mobile-menu" className="lp-menu" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {NAV_LINKS.map(([l, id]) => (
              <a key={l} href={`#${id}`} onClick={e => { e.preventDefault(); setMenuOpen(false); setTimeout(() => scrollToId(id), 60); }}>{l}</a>
            ))}
            <div style={{ marginTop: 18 }}>
              <LBtn block size="lg" href={LOGIN_PATH} onClick={() => { setMenuOpen(false); onEnter(); }}>Iniciar sesión</LBtn>
            </div>
            {onDevEnter && (
              <button type="button" onClick={() => { setMenuOpen(false); onDevEnter(); }}
                style={{ ...DEV_BTN, marginTop: 10, width: '100%', height: 48, fontSize: 15 }}>Entrar dev</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HERO ───────────────────────────────────────────── */}
      <section className="land-hero-section lp-hero">
        <div className="lp-hero-grid" aria-hidden="true" />
        <div className="lp-hero-glow" aria-hidden="true" />
        <div className="lp-hero-particles" aria-hidden="true">
          <Particles particleCount={isMobile ? 36 : 70} particleSpread={10} speed={0.05} particleColors={HERO_PARTICLES}
            alphaParticles particleBaseSize={60} sizeRandomness={0.8} moveParticlesOnHover={false} disableRotation={false} />
        </div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="lp-announce">
          <span className="lp-announce-tag">Nuevo</span>
          <ShinyText text="Marketplace multi-proyecto · Panamá" speed={3.6} color="rgba(255,255,255,0.7)" shineColor="#ffffff" className="lp-shiny" />
        </motion.div>
        <h1 className="land-hero-h1 lp-h1 lp-h1-bt">
          <BlurText text="Tokeniza activos tangibles" animateBy="words" direction="bottom" delay={90} stepDuration={0.38} className="lp-bt center" />
          <BlurText text="con La 33" animateBy="words" direction="bottom" delay={90} stepDuration={0.38} className="lp-bt center accent" />
        </h1>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }} className="land-hero-sub lp-hero-sub">
          Estructuramos y emitimos inmuebles, fincas, energía e infraestructura de empresas en Panamá y la región, y los conectamos con inversionistas en un solo marketplace.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.28 }} className="land-hero-ctas lp-hero-ctas">
          <LBtn size="lg" href={LOGIN_PATH} onClick={onEnter}>Tokeniza tu activo</LBtn>
          <LBtn size="lg" variant="ghost" href="#proyectos" onClick={() => scrollToId('proyectos')}>Ver el marketplace</LBtn>
        </motion.div>
      </section>

      {/* ─── Networks ──────────────────────────────────────── */}
      <section aria-label="Redes compatibles" className="lp-logos">
        <LogoLoop logos={CHAIN_LOGOS} speed={36} direction="left" logoHeight={24} gap={88} fadeOut fadeOutColor="#000000" ariaLabel="Redes blockchain" />
      </section>

      {/* ─── Figures ───────────────────────────────────────── */}
      <section aria-label="La 33 en cifras" className="lp-figures">
        {FIGURES.map(([n, suffix, label]) => (
          <div key={label} className="lp-figure">
            <div className="lp-figure-n"><CountUp to={n} duration={1.6} />{suffix}</div>
            <div className="lp-figure-l">{label}</div>
          </div>
        ))}
      </section>

      {/* ─── SOLUCIONES ─────────────────────────────────────── */}
      <section id="soluciones" className="land-section lp-section">
        <SectionHead pill="Soluciones" title={['Tokenización para empresas,', 'hecha en Panamá']}
          sub="Estructuramos y emitimos tus activos, y los conectamos con inversionistas en un marketplace multi-proyecto." />
        <Solutions cta={s => s.id === 'empresas'
          ? <LBtn href={LOGIN_PATH} onClick={onEnter}>{s.cta}</LBtn>
          : <LBtn variant="ghost" href="#proyectos" onClick={() => scrollToId('proyectos')}>{s.cta}</LBtn>} />
      </section>

      {/* ─── BENEFICIOS ─────────────────────────────────────── */}
      <section id="beneficios" className="land-section lp-section">
        <SectionHead pill="Beneficios" title={['Confianza institucional,', 'tecnología on-chain']}
          sub="Infraestructura completa para emitir, administrar y distribuir activos tokenizados." />
        <div className="ben-grid">
          {BENEFITS.map((x, i) => (
            <motion.div key={x.title} className="ben-item" {...reveal} transition={{ ...reveal.transition, delay: (i % 3) * 0.06 }}>
              <span className="ben-icon" aria-hidden="true">{x.icon}</span>
              <div className="ben-label">{x.label}</div>
              <h3 className="ben-title">{x.title}</h3>
              <p className="ben-desc">{x.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── MARKETPLACE (steps drive a live phone) ─────────── */}
      <section id="como" className="land-section lp-section">
        <SectionHead pill="Marketplace" title={['Así invierten', 'en tus proyectos']}
          sub="Cada activo que tokenizas llega a inversionistas verificados que compran y cobran desde el celular." />
        <div className="land-how" onMouseEnter={() => setStepsPaused(true)} onMouseLeave={() => setStepsPaused(false)}>
          <ol className="how-list">
            {HOW.map((h, i) => {
              const on = activeStep === i;
              return (
                <li key={h.n}>
                  <button className={`how-step${on ? ' on' : ''}`} aria-current={on ? 'step' : undefined} onClick={() => setActiveStep(i)}>
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

      {/* ─── PROYECTOS ──────────────────────────────────────── */}
      <section id="proyectos" className="land-section lp-section">
        <div className="lp-row-head">
          <SectionHead pill="Proyectos" title={['Activos de múltiples', 'originadores']} />
          <LBtn variant="ghost" href="/tokenizaciones" onClick={() => navigate('/tokenizaciones')}>Ver los {RWA_ASSETS.length} proyectos</LBtn>
        </div>
        <div className="lp-projects">
          {PROJECTS.map((a, i) => (
            <motion.a key={a.id} href={`/tokenizaciones/${a.id}`} onClick={e => goPage(e, `/tokenizaciones/${a.id}`)} className="lp-project"
              {...reveal} transition={{ ...reveal.transition, delay: (i % 4) * 0.05 }}>
              <span className="lp-project-img"><img src={a.img} alt="" loading="lazy" decoding="async" /></span>
              <span className="lp-project-name">{a.name}</span>
              <span className="lp-project-meta">{a.cat} · <b>{a.apy}% APY</b></span>
            </motion.a>
          ))}
        </div>
      </section>

      {/* ─── SIMULADOR ──────────────────────────────────────── */}
      <div id="simulador" className="lp-sim">
        <StrategySimulator head={
          <SectionHead center pill="Simulador" title={['Simula la tokenización', 'de tu proyecto']}
            sub="Elige el modelo, configura los parámetros de tu empresa y descubre cuánto puedes levantar en tu ronda." />
        } />
      </div>

      {/* ─── FAQ ────────────────────────────────────────────── */}
      <section id="faq" className="land-section lp-section lp-faq-wrap">
        <SectionHead pill="FAQ" title={['Preguntas', 'frecuentes']} sub="Lo esencial antes de tokenizar o invertir. ¿Algo más? Escríbenos." />
        <Faq />
      </section>

      {/* ─── CTA ────────────────────────────────────────────── */}
      <section className="land-cta-section lp-cta">
        <motion.div {...reveal} className="lp-cta-inner">
          <Pill text="Empieza hoy" />
          <ScrollReveal enableBlur baseOpacity={0.12} baseRotation={0} blurStrength={4} containerClassName="lp-sr" textClassName="lp-sr-text">
            Tu activo, listo para el mercado digital.
          </ScrollReveal>
          <p className="lp-sub">Habla con el equipo de La 33 en Panamá, estructura tu emisión y publícala en el marketplace.</p>
          <div className="lp-cta-btns">
            <LBtn size="lg" href={LOGIN_PATH} onClick={onEnter}>Tokeniza tu activo</LBtn>
            <LBtn size="lg" variant="ghost" href="/ayuda" onClick={() => navigate('/ayuda')}>Hablar con el equipo</LBtn>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <img src="/la33/la33-logo-dark.webp" alt="La 33 · Tokenización de activos tangibles" width={150} height={47} />
            <p>Tokenización B2B de activos tangibles. Ciudad de Panamá.</p>
            <LBtn size="sm" href={LOGIN_PATH} onClick={onEnter}>Empezar</LBtn>
          </div>
          <nav aria-label="Plataforma" className="lp-footer-col">
            <div className="lp-footer-h">Plataforma</div>
            {SITE_LINKS.map(([l, href]) => <a key={href} href={href} onClick={e => goPage(e, href)}>{l}</a>)}
          </nav>
          <nav aria-label="Secciones" className="lp-footer-col">
            <div className="lp-footer-h">La 33</div>
            {NAV_LINKS.map(([l, id]) => <a key={id} href={`#${id}`} onClick={e => goSection(e, id)}>{l}</a>)}
          </nav>
          <nav aria-label="Legal" className="lp-footer-col">
            <div className="lp-footer-h">Legal</div>
            {LEGAL_LINKS.map(([l, href]) => <a key={l} href={href} onClick={e => goPage(e, href)}>{l}</a>)}
          </nav>
        </div>
        <div className="lp-footer-mark" aria-hidden="true">LA 33</div>
        <div className="lp-footer-bottom">© 2026 La 33 · Tokenización de activos tangibles · Panamá</div>
      </footer>
    </div>
  );
}
