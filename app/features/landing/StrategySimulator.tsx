import { useState, useMemo, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sHover, sWhoosh } from '~/lib/landingSound';

/** Inline styles that also set CSS custom properties (`--c`, `--pct`). */
type CSSVars = CSSProperties & { [k: `--${string}`]: string };
const withVars = (style: CSSVars): CSSProperties => style;

/* ── Strategy Icons ── */
const CROWD_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="10" width="4" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
    <rect x="10" y="6" width="4" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
    <rect x="17" y="3" width="4" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
  </svg>
);
const STACK_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    <path d="M3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CYCLE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M20 12a8 8 0 01-13.66 5.66M4 12a8 8 0 0113.66-5.66" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M17.5 2.5v4h-4M6.5 21.5v-4h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 12.5l1.8 1.8 3.4-3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const REVENUE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 3a9 9 0 109 9h-9V3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    <path d="M15 3.5A9 9 0 0120.5 9H15V3.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
  </svg>
);
/* ── Stat Icons ── */
type StatIconType = 'money' | 'fee' | 'people' | 'token' | 'calendar' | 'chart' | 'lock' | 'vote' | 'yield';
type StatIconProps = { type: StatIconType };

const StatIcon = ({ type }: StatIconProps) => {
  const icons: Record<StatIconType, ReactElement> = {
    money:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7v10M9.5 9.5h3.75a1.75 1.75 0 010 3.5H10a1.75 1.75 0 100 3.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    fee:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M9 7h.01M15 17h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="9" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="15" cy="17" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>,
    people:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.7"/><path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M16 3.13a4 4 0 010 7.75M21 20c0-2.761-2-5-4.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    token:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="12,2 20,7 20,17 12,22 4,17 4,7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>,
    calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 2v4M16 2v4M3 9h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    chart:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M7 16l4-6 4 4 4-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    lock:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
    vote:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
    yield:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  };
  return <span style={{ color: 'currentColor', display: 'flex', alignItems: 'center' }}>{icons[type] || icons.money}</span>;
};

/* ── Strategies ── */
type StrategyId = 'crowdfunding' | 'acumulativa' | 'opcion' | 'revenue';

type StrategyParam = {
  id: string;
  label: string;
  unit: string;
  type: 'number' | 'range';
  min: number;
  max: number;
  step: number;
  default: number;
  help: string;
};

type Strategy = {
  id: StrategyId;
  label: string;
  icon: ReactNode;
  color: string;
  badge: string;
  tagline: string;
  desc: string;
  best: string[];
  complexity: string;
  duration: string;
  params: StrategyParam[];
};

/** Current simulator values, keyed by StrategyParam.id. */
type SimParams = Record<string, number>;

const FEE_PARAM = (def: number, help: string): StrategyParam => ({ id: 'platform', label: 'Fee de la plataforma', unit: '%', type: 'range', min: 1, max: 5, step: 0.5, default: def, help });

const STRATEGIES: Strategy[] = [
  {
    id: 'crowdfunding',
    label: 'Tokenización Crowdfunding',
    icon: CROWD_ICON,
    color: '#34d399',
    badge: 'Fraccionada clásica',
    tagline: 'Divides el activo en tokens y muchos inversores compran una parte',
    desc: 'El activo se fracciona en tokens con precio fijo. Cada inversor compra los que quiere y recibe rendimientos mensuales proporcionales (alquiler, producción, cosecha). Es el modelo más simple y el más fácil de explicar.',
    best: ['Inmuebles', 'Maquinaria agrícola', 'Flotas y vehículos'],
    complexity: 'Baja',
    duration: '6–60 meses',
    params: [
      { id: 'goal',      label: 'Valuación del activo',        unit: 'USD',    type: 'number', min: 50000, max: 10000000, step: 10000, default: 300000,
        help: 'El valor de mercado del activo que quieres tokenizar. Es la base para el precio por token y el retorno esperado.' },
      { id: 'tokens',    label: 'Cantidad de tokens a emitir', unit: 'tokens', type: 'number', min: 100,   max: 1000000,  step: 100,   default: 10000,
        help: 'Cada token es una fracción del activo. Más tokens = precio unitario más bajo = más inversores pequeños pueden entrar.' },
      { id: 'apy',       label: 'Rendimiento anual ofrecido',  unit: '%',      type: 'range',  min: 3,     max: 20,       step: 0.5,   default: 9.8,
        help: 'El retorno anual que reciben los holders. Calculalo sobre el ingreso real del activo (alquiler, producción, etc.).' },
      { id: 'duration',  label: 'Plazo del proyecto',          unit: 'meses',  type: 'range',  min: 6,     max: 60,       step: 3,     default: 24,
        help: 'Período en que los tokens generan rendimientos. Al vencimiento los holders pueden revender o renovar.' },
      { id: 'minticket', label: 'Ticket mínimo por inversor',  unit: 'USD',    type: 'range',  min: 1,     max: 5000,     step: 1,     default: 500,
        help: 'Inversión mínima por persona. Un ticket bajo amplía la base de inversores; uno alto atrae perfiles institucionales.' },
      FEE_PARAM(2.5, 'Comisión de La 33 por tokenización, custodia del activo y distribución de rendimientos on-chain.'),
    ],
  },
  {
    id: 'acumulativa',
    label: 'Tokenización Acumulativa',
    icon: STACK_ICON,
    color: '#fbbf24',
    badge: 'Mejoras con dilución',
    tagline: 'Los holders proponen mejoras y el activo crece ronda a ronda',
    desc: 'El activo arranca tokenizado al 100%. Cualquier holder puede proponer una mejora (ampliar, reformar, equipar). Si se financia, se emiten tokens nuevos: quien pone plata en la mejora mantiene su porcentaje y quien no participa se diluye, aunque su parte puede valer más porque el activo creció.',
    best: ['Inmuebles en desarrollo', 'Campos y viñedos', 'Hoteles y locales'],
    complexity: 'Media',
    duration: '24–120 meses',
    params: [
      { id: 'goal',    label: 'Valuación inicial del activo', unit: 'USD',    type: 'number', min: 50000, max: 10000000, step: 10000, default: 400000,
        help: 'Lo que vale el activo hoy. Representa el 100% de los tokens iniciales.' },
      { id: 'improve', label: 'Costo de cada mejora',         unit: 'USD',    type: 'number', min: 5000,  max: 5000000,  step: 5000,  default: 100000,
        help: 'Cuánto cuesta cada mejora propuesta. Se financia emitiendo tokens nuevos al precio vigente del activo.' },
      { id: 'uplift',  label: 'Revalorización por mejora',    unit: '%',      type: 'range',  min: 0,     max: 80,       step: 5,     default: 30,
        help: 'Cuánto valor extra genera la mejora por encima de lo que costó. Ej: inviertes $100K en una pileta y el activo sube $130K → 30%.' },
      { id: 'rounds',  label: 'Rondas de mejora',             unit: 'rondas', type: 'range',  min: 1,     max: 8,        step: 1,     default: 4,
        help: 'Cuántas mejoras se aprueban durante la vida del proyecto. Cada una es votada por los holders.' },
      { id: 'stake',   label: 'Tu participación inicial',     unit: '%',      type: 'range',  min: 1,     max: 50,       step: 1,     default: 10,
        help: 'El porcentaje del activo que tiene un holder de ejemplo. Vas a ver cómo evoluciona si acompaña las mejoras o si no.' },
      FEE_PARAM(2, 'Comisión de La 33 por cada ronda de emisión, votación on-chain y actualización de la valuación.'),
    ],
  },
  {
    id: 'opcion',
    label: 'Tokenización con Opción a Compra',
    icon: CYCLE_ICON,
    color: '#60a5fa',
    badge: 'Rent-to-own circular',
    tagline: 'Un operador usa el activo, paga renta y lo va comprando hasta ser dueño',
    desc: 'Los inversores financian el activo y un operador (productor, transportista, comerciante) lo usa pagando una cuota mensual: una parte es renta para los holders y otra recompra tokens. Cada recompra devuelve capital que se reinvierte en el próximo proyecto, un ciclo que mantiene viva la cartera mientras el operador se hace dueño.',
    best: ['Tractores y maquinaria', 'Flotas de camiones', 'Locales comerciales'],
    complexity: 'Media',
    duration: '24–96 meses',
    params: [
      { id: 'goal',    label: 'Valor del activo',                     unit: 'USD',   type: 'number', min: 10000, max: 5000000, step: 5000, default: 120000,
        help: 'Precio de compra del activo que va a usar el operador.' },
      { id: 'down',    label: 'Anticipo del operador',                unit: '%',     type: 'range',  min: 0,     max: 40,      step: 5,    default: 10,
        help: 'Lo que el operador pone al inicio. Desde el día uno es dueño de ese porcentaje del activo.' },
      { id: 'term',    label: 'Plazo para ser dueño',                 unit: 'meses', type: 'range',  min: 12,    max: 96,      step: 6,    default: 48,
        help: 'En cuánto tiempo el operador recompra todos los tokens. Plazo corto = cuota más alta, ciclo más rápido.' },
      { id: 'rent',    label: 'Renta anual para holders',             unit: '%',     type: 'range',  min: 4,     max: 18,      step: 0.5,  default: 10,
        help: 'Lo que paga el operador por usar la parte del activo que todavía es de los inversores. Baja a medida que recompra.' },
      { id: 'recycle', label: 'Capital que se reinvierte en el ciclo', unit: '%',    type: 'range',  min: 0,     max: 100,     step: 10,   default: 80,
        help: 'Qué parte del capital recomprado vuelve a entrar en nuevos activos de la cartera en vez de retirarse.' },
      FEE_PARAM(2, 'Comisión de La 33 por contratos de opción, cobro de cuotas y recompra automática de tokens.'),
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue Share con Techo',
    icon: REVENUE_ICON,
    color: '#c084fc',
    badge: 'Ingresos futuros',
    tagline: 'Los holders cobran un % de las ventas hasta un tope y el negocio sigue siendo tuyo',
    desc: 'En vez de vender una parte del activo, tokenizas sus ingresos futuros. Los holders reciben un porcentaje de la facturación mensual hasta cobrar un múltiplo pactado (por ejemplo 1.6x). Al llegar al tope los tokens se queman solos: no cedes propiedad y el inversor sabe exactamente cuánto va a cobrar.',
    best: ['Restaurantes y franquicias', 'E-commerce', 'Parques solares'],
    complexity: 'Baja',
    duration: '12–60 meses',
    params: [
      { id: 'goal',    label: 'Capital a levantar',            unit: 'USD', type: 'number', min: 10000, max: 5000000, step: 5000, default: 150000,
        help: 'Lo que necesitas para crecer: abrir un local, comprar stock, instalar paneles.' },
      { id: 'revenue', label: 'Facturación mensual actual',    unit: 'USD', type: 'number', min: 5000,  max: 5000000, step: 1000, default: 60000,
        help: 'Lo que factura el negocio hoy por mes. Es la base sobre la que se calcula el pago a los holders.' },
      { id: 'share',   label: '% de ingresos para holders',    unit: '%',   type: 'range',  min: 2,     max: 20,      step: 0.5,  default: 8,
        help: 'Qué porcentaje de cada venta va a los inversores mientras no se llegue al tope.' },
      { id: 'cap',     label: 'Tope de retorno',               unit: 'x',   type: 'range',  min: 1.2,   max: 3,       step: 0.1,  default: 1.6,
        help: 'Múltiplo del capital que cobra el inversor antes de que los tokens se quemen. 1.6x = por cada $100 recibe $160.' },
      { id: 'growth',  label: 'Crecimiento mensual de ventas', unit: '%',   type: 'range',  min: 0,     max: 6,       step: 0.5,  default: 1.5,
        help: 'Cuánto crecen las ventas cada mes gracias al capital. Más crecimiento = se llega antes al tope.' },
      FEE_PARAM(2, 'Comisión de La 33 por emisión, conciliación de ventas y pagos automáticos en USDC.'),
    ],
  },
];

/* ── Projection ── */
type ChartPoint = { month: number; [key: string]: number };
type ChartKind = 'pct';
type ProjStat = { key: string; label: string; value: string; icon: StatIconType; highlight?: boolean; note: string };
type ProjChart = { data: ChartPoint[]; key: string; compare?: string; fmt?: ChartKind; label: string; subtitle: string; legend?: [string, string] };
type TimelineItem = { top: string; value: string; sub: string; extra: string };
type Projection = {
  summary: string;
  stats: ProjStat[];
  charts: ProjChart[];
  timeline?: { title: string; items: TimelineItem[] };
};

function useProjection(strategy: Strategy | undefined, params: SimParams): Projection | null {
  return useMemo((): Projection | null => {
    if (!strategy || !params.goal) return null;
    const p = params;
    const fee = (p.platform || 2) / 100;
    const net = p.goal * (1 - fee);

    if (strategy.id === 'crowdfunding') {
      const tokenPrice = p.goal / (p.tokens || 10000);
      const investors = Math.round(p.goal / (p.minticket || 500));
      const monthlyReturn = (p.apy || 9.8) / 100 / 12;
      const months = Array.from({ length: (p.duration || 24) + 1 }, (_, i) => {
        const raised = i <= 2 ? p.goal * (i / 2) * 0.9 : p.goal;
        const paid = Math.max(0, i - 2) * (p.goal * monthlyReturn);
        return { month: i, raised: Math.min(raised, p.goal), paid };
      });
      const totalReturns = p.goal * ((p.apy || 9.8) / 100) * ((p.duration || 24) / 12);
      return {
        summary: `Tokenizas tu activo de ${fmt(p.goal)} y abres inversión desde $${p.minticket || 500}. Con ${investors.toLocaleString()} inversores al ${p.apy || 9.8}% anual, distribuyes ${fmt(totalReturns)} en rendimientos durante ${p.duration || 24} meses.`,
        stats: [
          { key: 'net',          label: 'Capital neto para ti',     value: fmt(net),                    icon: 'money',    highlight: true, note: 'Lo que recibes al completar la ronda, descontada la comisión.' },
          { key: 'investors',    label: 'Inversores estimados',      value: investors.toLocaleString(),  icon: 'people',   note: `Con ticket mínimo de $${p.minticket || 500} por participante.` },
          { key: 'tokenPrice',   label: 'Precio por token',          value: `$${tokenPrice.toFixed(2)}`, icon: 'token',    note: 'Cada token representa una fracción igual del activo.' },
          { key: 'totalReturns', label: 'Rendimientos a distribuir', value: fmt(totalReturns),           icon: 'yield',    note: 'Total que pagas a los holders durante el proyecto.' },
          { key: 'fee',          label: 'Comisión de La 33',     value: fmt(p.goal * fee),           icon: 'fee',      note: 'Tokenización, custodia del activo y distribución de rendimientos.' },
          { key: 'duration',     label: 'Plazo del proyecto',        value: `${p.duration || 24} meses`, icon: 'calendar', note: 'Los tokens se pueden revender en el mercado secundario.' },
        ],
        charts: [
          { data: months, key: 'raised', label: 'Capital levantado (USD)',         subtitle: 'Con activo concreto y rendimiento conocido, la ronda se llena rápido.' },
          { data: months, key: 'paid',   label: 'Rendimientos distribuidos (USD)', subtitle: 'Los pagos se ejecutan on-chain mes a mes, sin intervención manual.' },
        ],
      };
    }

    if (strategy.id === 'acumulativa') {
      const rounds = p.rounds || 4, C = p.improve || 100000, u = (p.uplift ?? 30) / 100, s0 = (p.stake || 10) / 100;
      let V = p.goal, sNo = s0, extra = 0;
      const series: ChartPoint[] = [{ month: 0, value: V, no: sNo * 100, yes: s0 * 100 }];
      const items: TimelineItem[] = [];
      for (let r = 1; r <= rounds; r++) {
        const dil = V / (V + C);       // new tokens priced at the pre-mejora value
        sNo *= dil;
        extra += s0 * C;               // pro-rata contribution to keep the stake
        V += C * (1 + u);
        series.push({ month: r, value: V, no: sNo * 100, yes: s0 * 100 });
        items.push({ top: `Mejora ${r}`, value: fmt(C), sub: `Activo: ${fmt(V)}`, extra: `${(sNo * 100).toFixed(1)}% sin seguir` });
      }
      const valNo = sNo * V, valYes = s0 * V, start = s0 * p.goal;
      return {
        summary: `El activo pasa de ${fmt(p.goal)} a ${fmt(V)} en ${rounds} mejoras. Un holder con ${(s0 * 100).toFixed(0)}% que acompaña cada ronda (aporta ${fmt(extra)}) mantiene su porcentaje y su parte vale ${fmt(valYes)}. Si no invierte, baja a ${(sNo * 100).toFixed(1)}%, aunque su parte vale ${fmt(valNo)} frente a los ${fmt(start)} del inicio.`,
        stats: [
          { key: 'value',  label: 'Valor final del activo',     value: fmt(V),                       icon: 'chart',  highlight: true, note: `Arranca en ${fmt(p.goal)} y suma ${fmt(C * (1 + u))} por mejora.` },
          { key: 'raised', label: 'Capital levantado en mejoras', value: fmt(C * rounds),            icon: 'money',  note: `${rounds} rondas de ${fmt(C)}, votadas por los holders.` },
          { key: 'yes',    label: 'Si acompañas las mejoras',   value: `${(s0 * 100).toFixed(1)}%`,  icon: 'token',  note: `Tu parte vale ${fmt(valYes)} y aportaste ${fmt(extra)} extra.` },
          { key: 'no',     label: 'Si no inviertes',             value: `${(sNo * 100).toFixed(1)}%`, icon: 'people', note: `Te diluyes, pero tu parte vale ${fmt(valNo)} (empezó en ${fmt(start)}).` },
          { key: 'gain',   label: 'Ganancia por acompañar',     value: fmt(valYes - valNo - extra),  icon: 'yield',  note: 'Valor extra de seguir las rondas, ya descontado lo que aportaste.' },
          { key: 'fee',    label: 'Comisión de La 33',      value: fmt(C * rounds * fee),        icon: 'fee',    note: 'Se cobra sobre cada ronda de mejora emitida.' },
        ],
        charts: [
          { data: series, key: 'yes', compare: 'no', fmt: 'pct', label: 'Tu porcentaje del activo', subtitle: 'Línea llena: acompañas cada mejora. Punteada: no inviertes y te diluyes.', legend: ['Acompañas', 'No inviertes'] },
          { data: series, key: 'value', label: 'Valor del activo (USD)', subtitle: 'Cada mejora aprobada y financiada por la comunidad suma valor al activo.' },
        ],
        timeline: { title: 'Rondas de mejora — cuánto entra y cómo se diluye quien no participa', items },
      };
    }

    if (strategy.id === 'opcion') {
      const term = p.term || 48, d = (p.down ?? 10) / 100, r = (p.rent || 10) / 100 / 12, rec = (p.recycle ?? 80) / 100;
      const F = p.goal * (1 - d), buy = F / term;
      let rentTotal = 0;
      const months = Array.from({ length: term + 1 }, (_, i) => {
        const outstanding = F - buy * i;
        if (i > 0) rentTotal += (outstanding + buy) * r;
        return { month: i, own: (d + (1 - d) * (i / term)) * 100, recycled: buy * i * rec };
      });
      const firstPay = buy + F * r;
      const items = Array.from({ length: Math.ceil(term / 12) }, (_, k) => {
        const m = Math.min((k + 1) * 12, term);
        return { top: `Año ${k + 1}`, value: `${(d * 100 + (1 - d) * (m / term) * 100).toFixed(0)}%`, sub: 'del operador', extra: `${fmt(buy * m * rec)} reinvertido` };
      });
      return {
        summary: `El operador pone ${fmt(p.goal * d)} y paga ${fmt(firstPay)} el primer mes (baja a medida que recompra). En ${term} meses es dueño del 100%. Los holders cobran ${fmt(rentTotal)} de renta y recuperan ${fmt(F)}, de los que ${fmt(F * rec)} vuelven a financiar el próximo activo del ciclo.`,
        stats: [
          { key: 'pay',     label: 'Cuota inicial del operador',  value: fmt(firstPay),               icon: 'calendar', highlight: true, note: `${fmt(buy)} de recompra + ${fmt(F * r)} de renta. La renta baja cada mes.` },
          { key: 'rent',    label: 'Renta total a holders',       value: fmt(rentTotal),              icon: 'yield',    note: `${p.rent || 10}% anual sobre la parte que todavía es de los inversores.` },
          { key: 'back',    label: 'Capital recuperado',          value: fmt(F),                      icon: 'money',    note: 'Vuelve completo a los holders vía recompra de tokens.' },
          { key: 'roi',     label: 'Retorno total del inversor',  value: `${(((F + rentTotal) / F - 1) * 100).toFixed(1)}%`, icon: 'chart', note: 'Renta cobrada sobre el capital invertido, sin depender de vender.' },
          { key: 'cycle',   label: 'Capital que sigue en el ciclo', value: fmt(F * rec),             icon: 'token',    note: `Alcanza para financiar el ${((F * rec) / p.goal * 100).toFixed(0)}% de un activo igual en la próxima vuelta.` },
          { key: 'fee',     label: 'Comisión de La 33',       value: fmt(F * fee),                icon: 'fee',      note: 'Contratos de opción, cobro de cuotas y recompras automáticas.' },
        ],
        charts: [
          { data: months, key: 'own',      fmt: 'pct', label: 'Propiedad del operador (%)',            subtitle: 'Cada cuota recompra tokens: el operador pasa de usuario a dueño.' },
          { data: months, key: 'recycled', label: 'Capital reinvertido en nuevos activos (USD)', subtitle: 'Lo recomprado vuelve al pool y financia el siguiente proyecto del ciclo.' },
        ],
        timeline: { title: 'Camino a la propiedad — año a año', items },
      };
    }

    if (strategy.id === 'revenue') {
      const cap = p.goal * (p.cap || 1.6), sh = (p.share || 8) / 100, g = (p.growth ?? 1.5) / 100;
      let paid = 0, m = 0;
      const months: ChartPoint[] = [{ month: 0, paid: 0, alive: 100 }];
      while (paid < cap && m < 120) {
        m++;
        paid = Math.min(cap, paid + (p.revenue || 60000) * Math.pow(1 + g, m - 1) * sh);
        months.push({ month: m, paid, alive: (1 - paid / cap) * 100 });
      }
      const done = paid >= cap;
      const irr = done ? (Math.pow(p.cap || 1.6, 12 / m) - 1) * 100 : null;
      const firstPay = (p.revenue || 60000) * sh;
      return {
        summary: done
          ? `Levantas ${fmt(p.goal)} sin ceder propiedad. Pagas el ${p.share || 8}% de tus ventas (${fmt(firstPay)} el primer mes) y en ${m} meses los holders cobran ${fmt(cap)}: ahí los tokens se queman y el negocio vuelve a ser 100% tuyo.`
          : `Con estas ventas no se llega al tope de ${fmt(cap)} en 10 años. Subí el % de ingresos, bajá el tope o el capital a levantar.`,
        stats: [
          { key: 'net',   label: 'Capital neto para ti',   value: fmt(net),                     icon: 'money',    highlight: true, note: 'Sin ceder un solo % de propiedad del negocio.' },
          { key: 'pay',   label: 'Pago del primer mes',     value: fmt(firstPay),                icon: 'calendar', note: `${p.share || 8}% de ${fmt(p.revenue || 60000)} de facturación.` },
          { key: 'time',  label: 'Meses hasta el tope',     value: done ? `${m} meses` : '+120', icon: 'chart',    note: 'Si vendes más, llegas antes y pagas menos intereses implícitos.' },
          { key: 'total', label: 'Total a devolver',        value: fmt(cap),                     icon: 'yield',    note: `${p.cap || 1.6}x el capital. Después no se paga nada más.` },
          { key: 'irr',   label: 'Retorno anual inversor',  value: irr ? `${irr.toFixed(1)}%` : '—', icon: 'token', note: 'Equivalente anual del múltiplo según el tiempo que tarda en cobrarse.' },
          { key: 'fee',   label: 'Comisión de La 33',   value: fmt(p.goal * fee),            icon: 'fee',      note: 'Emisión, conciliación de ventas y pagos automáticos.' },
        ],
        charts: [
          { data: months, key: 'paid',  label: 'Pagado a holders (USD)', subtitle: 'Crece con tus ventas y se detiene al llegar al tope pactado.' },
          { data: months, key: 'alive', fmt: 'pct', label: 'Tokens vigentes (%)', subtitle: 'Los tokens se queman a medida que se cobra: al llegar a 0% el negocio es 100% tuyo.' },
        ],
      };
    }
    return null;
  }, [strategy, params]);
}

function fmt(n: number | undefined): string {
  if (n === undefined || (!n && n !== 0)) return '-';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtNum(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}

/* ── Chart ── */
const fmtVal = (v: number, kind: ChartKind | undefined): string => kind === 'pct' ? `${v.toFixed(v < 10 ? 1 : 0)}%` : fmt(v);

type MiniChartProps = { data: ChartPoint[]; dataKey: string; compare?: string; kind?: ChartKind; color: string; height?: number };

function MiniChart({ data, dataKey, compare, kind, color, height = 100 }: MiniChartProps) {
  if (!data?.length) return null;
  const vals = data.flatMap(d => [d[dataKey] ?? 0, compare ? d[compare] ?? 0 : 0]);
  const max = Math.max(...vals, 1);
  const W = 500, H = height;
  const yOf = (v: number): number => H - (v / max) * (H - 14) - 7;
  const line = (key: string): string => data.map((d, i) => `${(i / Math.max(data.length - 1, 1)) * W},${yOf(d[key] ?? 0)}`).join(' ');
  const pts = line(dataKey);
  const gradId = `cg${color.replace(/[^a-z0-9]/gi, '')}${dataKey}`;
  const lastVal = data[data.length - 1]?.[dataKey] ?? 0;
  const lastCmp = compare ? data[data.length - 1]?.[compare] ?? 0 : 0;
  const label: CSSProperties = { position: 'absolute', right: 6, fontFamily: 'var(--font-b)', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' };
  // The svg stretches to the full width (no aspect lock); labels and the end dot
  // are HTML so they don't get distorted.
  return (
    <div style={{ position: 'relative', height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.30"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${gradId})`}/>
        {compare && <polyline points={line(compare)} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
      </svg>
      <span style={{ position: 'absolute', right: -5, top: yOf(lastVal) - 5, width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: '0 0 0 2px rgba(0,0,0,0.5)' }} />
      {lastVal ? <span style={{ ...label, top: yOf(lastVal) - 24, color }}>{fmtVal(lastVal, kind)}</span> : null}
      {compare && <span style={{ ...label, top: yOf(lastCmp) + 6, color: 'rgba(255,255,255,0.55)' }}>{fmtVal(lastCmp, kind)}</span>}
    </div>
  );
}

/* ── Param field: label + live value + slider (no boxes) ── */
const BRAND = '#F3B200';

type ParamFieldProps = { p: StrategyParam; value: number; onChange: (v: number) => void };

function ParamField({ p, value, onChange }: ParamFieldProps) {
  const shown = p.unit === 'USD' ? '$' + Number(value).toLocaleString('en-US')
    : p.type === 'number' ? `${fmtNum(value)} ${p.unit}` : `${value} ${p.unit}`;
  const pct = ((value - p.min) / (p.max - p.min)) * 100;
  return (
    <div className="sim2-field">
      <div className="sim2-field-head">
        <label htmlFor={`sim-${p.id}`}>{p.label}</label>
        <span>{shown}</span>
      </div>
      <input id={`sim-${p.id}`} type="range" min={p.min} max={p.max} step={p.step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="sim-range" style={withVars({ width: '100%', cursor: 'pointer', '--c': BRAND, '--pct': `${Math.max(0, Math.min(100, pct))}%` })} />
      {p.help && <p className="sim2-help">{p.help}</p>}
    </div>
  );
}

const SHORT_LABEL: Record<StrategyId, string> = {
  crowdfunding: 'Crowdfunding', acumulativa: 'Acumulativa', opcion: 'Opción a compra', revenue: 'Revenue share',
};
const defaultsOf = (s: Strategy): SimParams => Object.fromEntries(s.params.map(p => [p.id, p.default]));

// `head` replaces the default title block (the landing passes its animated one).
export type StrategySimulatorProps = { head?: ReactNode };

/**
 * Live calculator: pick a model, move the sliders, and the projection updates
 * next to them. No steps, no cards.
 */
export default function StrategySimulator({ head }: StrategySimulatorProps) {
  const [id, setId] = useState<StrategyId>(STRATEGIES[0].id);
  const [params, setParams] = useState<SimParams>(() => defaultsOf(STRATEGIES[0]));
  const strategy = STRATEGIES.find(s => s.id === id) ?? STRATEGIES[0];
  const proj = useProjection(strategy, params);

  const pick = (s: Strategy) => {
    if (s.id === id) return;
    sWhoosh();
    setId(s.id);
    setParams(defaultsOf(s));
  };

  const main = proj?.stats.find(st => st.highlight) ?? proj?.stats[0];
  const rest = proj?.stats.filter(st => st !== main) ?? [];
  const chart = proj?.charts[0];

  return (
    <section style={{ maxWidth: 1160, margin: '0 auto', padding: '88px 48px' }} className="land-section">
      {head || (
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 40, color: BRAND, margin: 0, lineHeight: 1.15 }}>Simula la tokenización de tu proyecto</h2>
        </div>
      )}

      <div className="sim2-models" role="tablist" aria-label="Modelo de tokenización">
        {STRATEGIES.map(s => (
          <button key={s.id} role="tab" aria-selected={s.id === id} className={`sim2-model${s.id === id ? ' on' : ''}`}
            onMouseEnter={sHover} onClick={e => { pick(s); e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }}>
            <span className="sim2-model-ico" aria-hidden="true">{s.icon}</span>{SHORT_LABEL[s.id]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.p key={id} className="sim2-tagline" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {strategy.tagline}
          <span>Ideal para: {strategy.best.join(' · ')} — complejidad {strategy.complexity.toLowerCase()}, {strategy.duration}</span>
        </motion.p>
      </AnimatePresence>

      <div className="sim2-body">
        <div className="sim2-params">
          <div className="sim2-col-title">Tu proyecto</div>
          {strategy.params.map(p => (
            <ParamField key={`${id}-${p.id}`} p={p} value={params[p.id] ?? p.default} onChange={v => setParams(x => ({ ...x, [p.id]: v }))} />
          ))}
        </div>

        <div className="sim2-results" aria-live="polite">
          <div className="sim2-col-title">Proyección</div>
          {main && (
            <div className="sim2-main">
              <div className="sim2-main-label">{main.label}</div>
              <div className="sim2-main-value">{main.value}</div>
              <div className="sim2-main-note">{main.note}</div>
            </div>
          )}
          <dl className="sim2-stats">
            {rest.map(st => (
              <div key={st.key} title={st.note}>
                <dt><StatIcon type={st.icon} />{st.label}</dt>
                <dd>{st.value}</dd>
              </div>
            ))}
          </dl>
          {chart && (
            <div className="sim2-chart">
              <div className="sim2-chart-label">{chart.label}</div>
              {chart.legend && (
                <div className="sim2-legend">
                  <span><i style={{ background: BRAND }} />{chart.legend[0]}</span>
                  <span><i className="dash" />{chart.legend[1]}</span>
                </div>
              )}
              <MiniChart data={chart.data} dataKey={chart.key} compare={chart.compare} kind={chart.fmt} color={BRAND} height={110} />
              <div className="sim2-chart-sub">{chart.subtitle}</div>
            </div>
          )}
          {proj && <p className="sim2-summary">{proj.summary}</p>}
        </div>
      </div>

      <p className="sim2-disclaimer">
        Proyección estimada con fines ilustrativos. Los resultados reales dependen del mercado, la demanda y la ejecución del proyecto. No constituye asesoramiento financiero.
      </p>
    </section>
  );
}
