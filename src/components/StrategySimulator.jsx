import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sHover, sWhoosh } from '../lib/landingSound';

/* ── Strategy Icons ── */
const ICO_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);
const CROWD_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="10" width="4" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
    <rect x="10" y="6" width="4" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
    <rect x="17" y="3" width="4" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
  </svg>
);
const ESCROW_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
  </svg>
);
const DAO_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="1.7"/>
    <circle cx="5" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.7"/>
    <circle cx="19" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M8.5 16l3-2M15.5 16l-3-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const CHECK_ICON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Stat Icons ── */
const StatIcon = ({ type }) => {
  const icons = {
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
const STRATEGIES = [
  {
    id: 'ico',
    label: 'ICO con Vesting',
    icon: ICO_ICON,
    color: '#a78bfa',
    badge: 'Token de utilidad',
    tagline: 'Emitís tu propio token y lo vendés al público',
    desc: 'Creás un token ERC-20, definís cuánto cuesta, cuántos vendés y en qué tiempo los inversores pueden retirar sus tokens. Es la forma más directa de levantar capital tokenizando tu startup.',
    best: ['Startups tech', 'Protocolos DeFi', 'Plataformas SaaS'],
    complexity: 'Media',
    duration: '3–18 meses',
    params: [
      { id: 'goal',     label: 'Objetivo de fundraising',    unit: 'USD',     type: 'number', min: 10000,  max: 10000000, step: 10000,  default: 500000,
        help: '¿Cuánto capital necesitás levantar? Este es tu objetivo total de la ronda. Incluí desarrollo, operaciones y reservas.' },
      { id: 'supply',   label: 'Supply total de tokens',     unit: 'tokens',  type: 'number', min: 100000, max: 1e9,      step: 100000, default: 10000000,
        help: 'La cantidad total de tokens que vas a emitir. El 30% típicamente va a la venta pública. Cuanto más supply, menor el precio por unidad.' },
      { id: 'tge',      label: 'TGE — liberación inicial',  unit: '%',       type: 'range',  min: 5,      max: 40,       step: 5,      default: 15,
        help: 'Token Generation Event: qué % recibe el inversor el día del lanzamiento. Un TGE bajo (10–20%) genera menos presión de venta inmediata.' },
      { id: 'cliff',    label: 'Período de cliff',           unit: 'meses',   type: 'range',  min: 0,      max: 12,       step: 1,      default: 3,
        help: 'Tiempo de espera antes de que empiece el vesting. Durante el cliff nadie puede vender. Transmite compromiso del equipo al mercado.' },
      { id: 'vesting',  label: 'Duración del vesting',      unit: 'meses',   type: 'range',  min: 6,      max: 36,       step: 3,      default: 12,
        help: 'Tiempo total en que los tokens restantes se liberan gradualmente tras el cliff. Protege el precio evitando ventas masivas.' },
      { id: 'platform', label: 'Fee de la plataforma',      unit: '%',       type: 'range',  min: 1,      max: 5,        step: 0.5,    default: 2,
        help: 'Comisión de Factoract por gestionar la tokenización, contratos y cumplimiento regulatorio.' },
    ],
  },
  {
    id: 'crowdfunding',
    label: 'Tokenización Crowdfunding',
    icon: CROWD_ICON,
    color: '#34d399',
    badge: 'Activos reales (RWA)',
    tagline: 'Fraccionás un activo físico y lo abrís a múltiples inversores',
    desc: 'Tokenizás la propiedad de un activo real (inmueble, maquinaria, flota) en tokens digitales. Los inversores compran fracciones y reciben rendimientos proporcionales a su participación.',
    best: ['Inmuebles', 'Maquinaria agrícola', 'Flotas y vehículos'],
    complexity: 'Baja',
    duration: '6–60 meses',
    params: [
      { id: 'goal',       label: 'Valuación del activo',          unit: 'USD',    type: 'number', min: 50000, max: 10000000, step: 10000, default: 300000,
        help: 'El valor de mercado del activo que querés tokenizar. Esta es la base para el precio por token y el retorno esperado.' },
      { id: 'tokens',     label: 'Cantidad de tokens a emitir',   unit: 'tokens', type: 'number', min: 100,   max: 1000000,  step: 100,   default: 10000,
        help: 'Cada token representa una fracción del activo. Más tokens = menor precio unitario = mayor accesibilidad para pequeños inversores.' },
      { id: 'apy',        label: 'Rendimiento anual ofrecido',    unit: '%',      type: 'range',  min: 3,     max: 20,       step: 0.5,   default: 9.8,
        help: 'El retorno porcentual anual que los holders recibirán. Calculalo en base al ingreso real del activo (alquiler, producción, etc.).' },
      { id: 'duration',   label: 'Plazo del proyecto',            unit: 'meses',  type: 'range',  min: 6,     max: 60,       step: 3,     default: 24,
        help: 'Período durante el cual los tokens generan rendimientos. Al vencimiento los inversores pueden revender o renovar su participación.' },
      { id: 'minticket',  label: 'Ticket mínimo por inversor',    unit: 'USD',    type: 'range',  min: 38,    max: 5000,     step: 50,    default: 500,
        help: 'Inversión mínima por persona. Un ticket bajo amplía la base de inversores; uno alto atrae perfiles más institucionales.' },
      { id: 'platform',   label: 'Fee de la plataforma',          unit: '%',      type: 'range',  min: 1,     max: 5,        step: 0.5,   default: 2.5,
        help: 'Comisión de Factoract por tokenización, custodia del activo y distribución de rendimientos on-chain.' },
    ],
  },
  {
    id: 'escrow',
    label: 'Tokenización Escrow',
    icon: ESCROW_ICON,
    color: '#60a5fa',
    badge: 'Por hitos verificados',
    tagline: 'El capital se libera solo cuando cumplís tus hitos',
    desc: 'El dinero queda bloqueado en un smart contract. Los inversores aprueban la liberación de fondos cuando verifican que completaste cada hito del proyecto. Máxima transparencia y confianza.',
    best: ['Construcción', 'I+D tecnológico', 'Proyectos por etapas'],
    complexity: 'Alta',
    duration: '2–24 meses',
    params: [
      { id: 'goal',       label: 'Capital total a levantar',      unit: 'USD',      type: 'number', min: 50000, max: 5000000, step: 10000, default: 200000,
        help: 'El capital total que necesitás para todo el proyecto. Este monto se divide entre los hitos definidos.' },
      { id: 'milestones', label: 'Número de hitos',               unit: 'hitos',    type: 'range',  min: 2,     max: 8,       step: 1,     default: 4,
        help: 'Cada hito es un entregable verificable: prototipo, lanzamiento, métricas de usuarios, etc. Más hitos = más control para inversores.' },
      { id: 'period',     label: 'Semanas por hito',              unit: 'semanas',  type: 'range',  min: 2,     max: 24,      step: 1,     default: 8,
        help: 'Cuánto tiempo estimás para completar cada hito. Sé realista — los inversores valorarán tu capacidad de cumplir plazos.' },
      { id: 'bonus',      label: 'Retorno por hito cumplido',     unit: '%',        type: 'range',  min: 0,     max: 10,      step: 0.5,   default: 2.5,
        help: 'Bonus porcentual para los inversores al verificarse cada hito. Incentiva la participación y recompensa la confianza temprana.' },
      { id: 'platform',   label: 'Fee de la plataforma',          unit: '%',        type: 'range',  min: 1,     max: 5,       step: 0.5,   default: 2,
        help: 'Comisión de Factoract por contratos de escrow, verificación de hitos y distribución de bonos on-chain.' },
    ],
  },
  {
    id: 'dao',
    label: 'DAO de Gobernanza',
    icon: DAO_ICON,
    color: '#fb923c',
    badge: 'Comunidad + Capital',
    tagline: 'Los inversores votan las decisiones de tu proyecto',
    desc: 'Emitís tokens de gobernanza que dan a los holders poder de voto sobre el futuro del proyecto. Ideal cuando querés construir comunidad activa y descentralizar la toma de decisiones.',
    best: ['Protocolos DeFi', 'Fondos colectivos', 'Cooperativas digitales'],
    complexity: 'Alta',
    duration: '12–36 meses',
    params: [
      { id: 'goal',     label: 'Capital objetivo de la ronda',    unit: 'USD',    type: 'number', min: 50000, max: 5000000, step: 10000,  default: 1000000,
        help: 'El capital que querés levantar vendiendo tokens de gobernanza. Define la valoración inicial del protocolo.' },
      { id: 'supply',   label: 'Supply de tokens de gobernanza', unit: 'tokens', type: 'number', min: 100000,max: 1e9,     step: 100000, default: 50000000,
        help: 'Total de tokens a emitir. Los holders usan estos tokens para votar propuestas. Mayor supply = más distribución comunitaria.' },
      { id: 'reserved', label: 'Reservado para el equipo',       unit: '%',      type: 'range',  min: 10,    max: 40,      step: 5,      default: 20,
        help: '% del supply que el equipo fundador retiene. El estándar del mercado es 15–25%. Menos % demuestra mayor descentralización.' },
      { id: 'staking',  label: 'APY de staking',                 unit: '%',      type: 'range',  min: 2,     max: 20,      step: 0.5,    default: 11,
        help: 'Recompensa anual para inversores que bloquean sus tokens en staking. Incentiva retención y reduce la presión de venta.' },
      { id: 'quorum',   label: 'Quórum mínimo para votar',       unit: '%',      type: 'range',  min: 5,     max: 51,      step: 1,      default: 15,
        help: '% de tokens que deben participar para que una propuesta sea válida. Bajo = más fácil gobernar; alto = más seguridad.' },
      { id: 'platform', label: 'Fee de la plataforma',           unit: '%',      type: 'range',  min: 1,     max: 5,       step: 0.5,    default: 1.5,
        help: 'Comisión de Factoract por setup de la DAO, contratos de gobernanza y distribución de recompensas de staking.' },
    ],
  },
];

/* ── Projection ── */
function useProjection(strategy, params) {
  return useMemo(() => {
    if (!strategy || !params.goal) return null;
    const p = params;
    const fee = (p.platform || 2) / 100;
    const net = p.goal * (1 - fee);

    if (strategy.id === 'ico') {
      const publicTokens = (p.supply || 10000000) * 0.30;
      const price = p.goal / publicTokens;
      const investors = Math.round(p.goal / 2500);
      const totalMonths = (p.cliff || 0) + (p.vesting || 12);
      const months = Array.from({ length: totalMonths + 1 }, (_, i) => {
        const raised = i <= 2 ? p.goal * (i / 2) * 0.85 : p.goal;
        const unlocked = i === 0 ? (p.tge || 15) / 100
          : i <= (p.cliff || 0) ? (p.tge || 15) / 100
          : (p.tge || 15) / 100 + ((i - (p.cliff || 0)) / (p.vesting || 12)) * (1 - (p.tge || 15) / 100);
        return { month: i, raised: Math.min(raised, p.goal), unlocked: Math.min(unlocked, 1) * 100 };
      });
      return {
        color: strategy.color,
        summary: `Tu ICO puede levantar hasta ${fmt(p.goal)} con aproximadamente ${investors.toLocaleString()} inversores a $${price.toFixed(4)} por token. Los primeros fondos llegan en las primeras semanas de apertura de la ronda.`,
        stats: [
          { key: 'net',          label: 'Capital neto para vos',    value: fmt(net),                  icon: 'money',    highlight: true,  note: 'Lo que recibís después de la comisión de plataforma.' },
          { key: 'fee',          label: 'Comisión de Factoract',    value: fmt(p.goal * fee),          icon: 'fee',      highlight: false, note: 'Cubre contratos, cumplimiento y soporte de la ronda.' },
          { key: 'investors',    label: 'Inversores estimados',     value: investors.toLocaleString(), icon: 'people',   highlight: false, note: 'Basado en un ticket promedio de $2,500 por inversor.' },
          { key: 'tokenPrice',   label: 'Precio por token',         value: `$${price.toFixed(4)}`,     icon: 'token',    highlight: false, note: '30% del supply va a venta pública para el fundraising.' },
          { key: 'duration',     label: 'Período total de vesting', value: `${totalMonths} meses`,     icon: 'calendar', highlight: false, note: `${p.cliff || 0} meses de cliff + ${p.vesting || 12} meses de liberación gradual.` },
          { key: 'publicTokens', label: 'Tokens en venta pública',  value: fmtNum(publicTokens),       icon: 'chart',    highlight: false, note: 'El resto se reserva para equipo, advisors y tesorería.' },
        ],
        charts: [
          { data: months, key: 'raised',   label: 'Capital levantado (USD)',  subtitle: 'La captación sube rápido al abrir la ronda y se estabiliza al alcanzar el objetivo.' },
          { data: months, key: 'unlocked', label: 'Tokens desbloqueados (%)', subtitle: 'El plateau al inicio es el cliff — en ese período nadie puede vender sus tokens.' },
        ],
      };
    }

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
        color: strategy.color,
        summary: `Tokenizás tu activo de ${fmt(p.goal)} y abrís inversión desde $${p.minticket || 500}. Con ${investors.toLocaleString()} inversores al ${p.apy || 9.8}% APY, distribuís ${fmt(totalReturns)} en rendimientos durante ${p.duration || 24} meses.`,
        stats: [
          { key: 'net',          label: 'Capital neto para vos',      value: fmt(net),                  icon: 'money',    highlight: true,  note: 'Lo que recibís al completar el fundraising, descontada la comisión.' },
          { key: 'fee',          label: 'Comisión de Factoract',      value: fmt(p.goal * fee),          icon: 'fee',      highlight: false, note: 'Incluye tokenización, custodia del activo y distribución de yields.' },
          { key: 'investors',    label: 'Inversores estimados',       value: investors.toLocaleString(), icon: 'people',   highlight: false, note: `Con ticket mínimo de $${p.minticket || 500} por participante.` },
          { key: 'tokenPrice',   label: 'Precio por token',           value: `$${tokenPrice.toFixed(2)}`,icon: 'token',    highlight: false, note: 'Cada token representa una fracción igual del activo tokenizado.' },
          { key: 'totalReturns', label: 'Rendimientos a distribuir',  value: fmt(totalReturns),          icon: 'yield',    highlight: false, note: 'Total de rendimientos que pagarás a los holders durante el proyecto.' },
          { key: 'duration',     label: 'Plazo del proyecto',         value: `${p.duration || 24} meses`,icon: 'calendar', highlight: false, note: 'Los tokens se pueden revender en mercado secundario en cualquier momento.' },
        ],
        charts: [
          { data: months, key: 'raised', label: 'Capital levantado (USD)',         subtitle: 'Con activo concreto y rendimiento conocido, la captación es rápida y predecible.' },
          { data: months, key: 'paid',   label: 'Rendimientos distribuidos (USD)', subtitle: 'Los pagos se ejecutan automáticamente on-chain mes a mes sin intervención manual.' },
        ],
      };
    }

    if (strategy.id === 'escrow') {
      const totalWeeks = (p.milestones || 4) * (p.period || 8);
      const perMilestone = p.goal / (p.milestones || 4);
      const totalReturn = p.goal * (1 + (p.bonus || 2.5) / 100 * (p.milestones || 4));
      const investors = Math.round(p.goal / 5000);
      const weeks = Array.from({ length: totalWeeks + 1 }, (_, i) => {
        const done = Math.floor(i / (p.period || 8));
        const released = done * perMilestone;
        return { month: i, released: Math.min(released, p.goal) };
      });
      return {
        color: strategy.color,
        summary: `Tu proyecto se financia en ${p.milestones || 4} hitos verificables. Cada ${p.period || 8} semanas liberás ${fmt(perMilestone)} del escrow al cumplir el entregable. Los inversores reciben un bonus de ${p.bonus || 2.5}% por cada hito aprobado.`,
        stats: [
          { key: 'net',          label: 'Capital neto para vos',      value: fmt(net),              icon: 'money',    highlight: true,  note: 'Capital total menos la comisión de Factoract.' },
          { key: 'fee',          label: 'Comisión de Factoract',      value: fmt(p.goal * fee),     icon: 'fee',      highlight: false, note: 'Incluye contratos de escrow, verificación y distribución de bonos.' },
          { key: 'investors',    label: 'Inversores estimados',       value: investors.toLocaleString(), icon: 'people', highlight: false, note: 'Perfil más institucional — ticket promedio $5,000.' },
          { key: 'perMilestone', label: 'Capital por hito',           value: fmt(perMilestone),     icon: 'lock',     highlight: false, note: 'Se libera automáticamente al verificarse el hito on-chain.' },
          { key: 'totalReturn',  label: 'Retorno total a inversores', value: fmt(totalReturn),      icon: 'yield',    highlight: false, note: 'Capital original + bonos acumulados por todos los hitos cumplidos.' },
          { key: 'duration',     label: 'Duración estimada',          value: `${Math.round(totalWeeks / 4)} meses`, icon: 'calendar', highlight: false, note: 'Plazos claros y verificables aumentan la confianza del inversor.' },
        ],
        charts: [
          { data: weeks, key: 'released', label: 'Capital liberado por hitos (USD)', subtitle: 'Cada escalón en la curva representa un hito completado y aprobado por los inversores.' },
        ],
        milestones: Array.from({ length: p.milestones || 4 }, (_, i) => ({
          n: i + 1, amount: perMilestone, week: (i + 1) * (p.period || 8), bonus: p.bonus || 2.5,
        })),
      };
    }

    if (strategy.id === 'dao') {
      const publicSupply = (p.supply || 50000000) * (1 - (p.reserved || 20) / 100);
      const tokenPrice = p.goal / publicSupply;
      const investors = Math.round(p.goal / 3000);
      const months = Array.from({ length: 25 }, (_, i) => {
        const raised = i <= 3 ? p.goal * (i / 3) * 0.85 : p.goal;
        const stakingPaid = Math.max(0, i - 2) * (p.goal * (p.staking || 11) / 100 / 12);
        return { month: i, raised: Math.min(raised, p.goal), staking: stakingPaid };
      });
      return {
        color: strategy.color,
        summary: `Tu DAO recauda ${fmt(p.goal)} y distribuye ${100 - (p.reserved || 20)}% del poder de voto a la comunidad. Los stakers ganan ${p.staking || 11}% APY por participar activamente en la gobernanza del protocolo.`,
        stats: [
          { key: 'net',          label: 'Capital neto del protocolo', value: fmt(net),              icon: 'money',    highlight: true,  note: 'Fondos disponibles para desarrollo y operaciones del protocolo.' },
          { key: 'fee',          label: 'Comisión de Factoract',      value: fmt(p.goal * fee),     icon: 'fee',      highlight: false, note: 'Setup de la DAO, contratos de gobernanza y distribución de staking.' },
          { key: 'investors',    label: 'Holders estimados',          value: investors.toLocaleString(), icon: 'people', highlight: false, note: 'Ticket promedio $3,000 en rondas de gobernanza.' },
          { key: 'tokenPrice',   label: 'Precio por token',           value: `$${tokenPrice.toFixed(5)}`, icon: 'token', highlight: false, note: 'Precio base de lanzamiento para la venta pública inicial.' },
          { key: 'publicSupply', label: 'Supply para la comunidad',   value: `${100 - (p.reserved || 20)}%`, icon: 'vote', highlight: false, note: 'Mayor distribución = gobernanza más descentralizada y legítima.' },
          { key: 'quorum',       label: 'Quórum de gobernanza',       value: `${p.quorum || 15}%`,  icon: 'vote',     highlight: false, note: '% de tokens que deben votar para que una propuesta sea válida.' },
        ],
        charts: [
          { data: months, key: 'raised',  label: 'Capital levantado (USD)',        subtitle: 'Los protocolos DAO atraen capital gradualmente con actividad comunitaria sostenida.' },
          { data: months, key: 'staking', label: 'Recompensas de staking (USD)',   subtitle: 'Los stakers acumulan retornos mientras participan en la gobernanza del protocolo.' },
        ],
      };
    }
    return null;
  }, [strategy, params]);
}

function fmt(n) {
  if (!n && n !== 0) return '-';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtNum(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}

/* ── Chart ── */
function MiniChart({ data, dataKey, color, height = 100 }) {
  if (!data?.length) return null;
  const vals = data.map(d => d[dataKey] ?? 0);
  const max = Math.max(...vals, 1);
  const W = 500, H = height;
  const pts = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * W;
    const y = H - ((d[dataKey] ?? 0) / max) * (H - 14) - 7;
    return `${x},${y}`;
  }).join(' ');
  const gradId = `cg${color.replace(/[^a-z0-9]/gi, '')}${dataKey}`;
  const lastVal = data[data.length - 1]?.[dataKey] ?? 0;
  const lastY = H - (lastVal / max) * (H - 14) - 7;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height, display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${gradId})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={W} cy={lastY} r="5" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="2"/>
      <text x={W - 6} y={lastY - 11} textAnchor="end" fill={color} fontSize="11" fontWeight="700" fontFamily="sans-serif">
        {fmt(lastVal) !== '$0' ? fmt(lastVal) : ''}
      </text>
    </svg>
  );
}

/* ── Param field with help text ── */
function ParamField({ p, value, onChange, color }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
        <label style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.52)' }}>
          {p.label}
        </label>
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 14, fontWeight: 800, color }}>
          {p.type === 'number'
            ? p.id === 'supply' ? fmtNum(value) + ' tokens' : '$' + Number(value).toLocaleString()
            : `${value} ${p.unit}`}
        </span>
      </div>

      {p.type === 'number' ? (
        <input type="number" min={p.min} max={p.max} step={p.step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 11, boxSizing: 'border-box',
            background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${focused ? color : 'rgba(255,255,255,0.08)'}`,
            color: 'rgba(255,255,255,0.88)', fontFamily: 'var(--font-b)', fontSize: 14,
            outline: 'none', transition: 'all 0.15s',
          }}
        />
      ) : (
        <div style={{ paddingTop: 2 }}>
          <input type="range" min={p.min} max={p.max} step={p.step} value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="sim-range" style={{ width: '100%', accentColor: color, cursor: 'pointer', '--c': color, '--pct': `${((value - p.min) / (p.max - p.min)) * 100}%` }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>{p.min} {p.unit}</span>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>{p.max} {p.unit}</span>
          </div>
        </div>
      )}

      {p.help && (
        <p style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'rgba(255,255,255,0.28)', margin: 0, lineHeight: 1.55 }}>
          {p.help}
        </p>
      )}
    </div>
  );
}

const STEPS = [
  { label: 'Modelo',     desc: 'Elegí tu estructura' },
  { label: 'Proyecto',   desc: 'Configurá los parámetros' },
  { label: 'Proyección', desc: 'Mirá los resultados' },
];

// `head` replaces the default title block (the landing passes its animated one).
export default function StrategySimulator({ head }) {
  const [step, setStep]             = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [params, setParams]         = useState({});

  const strategy = STRATEGIES.find(s => s.id === selectedId);
  const proj     = useProjection(strategy, params);

  const initParams = (s) => {
    const d = {};
    s.params.forEach(p => { d[p.id] = p.default; });
    setParams(d);
  };

  const setP  = (id, val) => setParams(p => ({ ...p, [id]: val }));
  const reset = () => { setStep(0); setSelectedId(null); setParams({}); };
  const goNext = () => {
    sWhoosh();
    if (step === 0 && strategy) { initParams(strategy); setStep(1); }
    else if (step === 1) setStep(2);
  };
  const spot = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  const canNext = step === 0 ? !!selectedId : step === 1;

  return (
    <section style={{ maxWidth: 1160, margin: '0 auto', padding: '88px 48px' }} className="land-section">

      {/* Header */}
      {head || (
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <h2 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.93)', margin: 0, lineHeight: 1.15 }}>
          Simulá la tokenización<br/>de tu proyecto
        </h2>
      </div>
      )}

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div onClick={() => i < step && setStep(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: i < step ? 'pointer' : 'default' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: i === step ? `0 0 18px ${strategy?.color || '#7fb2ff'}88` : 'none',
                fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 12, flexShrink: 0,
                background: i === step ? (strategy?.color || '#fff') : i < step ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                color: i === step ? '#050505' : i < step ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.20)',
                border: `1.5px solid ${i === step ? (strategy?.color || '#fff') : i < step ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
                transition: 'all 0.25s',
              }}>{i < step ? CHECK_ICON : i + 1}</div>
              <div style={{ opacity: i > step ? 0.28 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: i === step ? 700 : 500, color: i === step ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.45)', lineHeight: 1.2 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, color: 'rgba(255,255,255,0.22)' }}>{s.desc}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 54, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.07)', margin: '0 16px', overflow: 'hidden' }}>
                <motion.div initial={false} animate={{ width: i < step ? '100%' : '0%' }} transition={{ duration: 0.5 }}
                  style={{ height: '100%', background: `linear-gradient(90deg, #7fb2ff, ${strategy?.color || '#a78bfa'})`, boxShadow: '0 0 10px rgba(127,178,255,0.8)' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="sim-main" style={{
        background: 'rgba(255,255,255,0.030)',
        backdropFilter: 'blur(52px) saturate(180%)',
        WebkitBackdropFilter: 'blur(52px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 28,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.70)',
        overflow: 'hidden',
      }}>
        <AnimatePresence mode="wait">

          {/* ── STEP 0: Elegir modelo ── */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.22 }}
              style={{ padding: '40px 40px 28px' }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 20, color: 'rgba(255,255,255,0.88)', marginBottom: 6 }}>¿Qué modelo de tokenización usás?</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'rgba(255,255,255,0.34)', lineHeight: 1.55 }}>Cada modelo tiene ventajas distintas según el tipo de proyecto, activo y nivel de confianza que querés transmitir a tus inversores.</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }} className="sim-grid">
                {STRATEGIES.map(s => {
                  const sel = selectedId === s.id;
                  return (
                    <motion.button key={s.id} onClick={() => setSelectedId(sel ? null : s.id)}
                      onMouseMove={spot} onMouseEnter={sHover} whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }}
                      className={`sim-card${sel ? ' sel' : ''}`}
                      style={{
                      '--c': s.color,
                      background: sel ? `${s.color}0e` : 'rgba(255,255,255,0.022)',
                      border: `1.5px solid ${sel ? 'transparent' : 'rgba(255,255,255,0.07)'}`, overflow: 'hidden',
                      borderRadius: 18, padding: '22px 22px 18px', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.18s', position: 'relative',
                      boxShadow: sel ? `0 0 0 1px ${s.color}22, 0 8px 32px ${s.color}14` : 'none',
                    }}>
                      {sel && (
                        <div className="sim-check" style={{ position: 'absolute', top: 16, right: 16, width: 22, height: 22, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050505' }}>
                          {CHECK_ICON}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 13, background: `${s.color}14`, border: `1px solid ${s.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
                          {s.icon}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: sel ? s.color : 'rgba(255,255,255,0.88)', marginBottom: 3 }}>{s.label}</div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: `${s.color}aa`, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.badge}</div>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'rgba(255,255,255,0.72)', fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
                        {s.tagline}
                      </div>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'rgba(255,255,255,0.34)', lineHeight: 1.55, marginBottom: 14 }}>{s.desc}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        {s.best.map(b => (
                          <span key={b} style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: `${s.color}cc`, background: `${s.color}10`, border: `1px solid ${s.color}22`, borderRadius: 6, padding: '3px 9px' }}>{b}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 20, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 10, color: 'rgba(255,255,255,0.20)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Complejidad</div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.52)', marginTop: 3 }}>{s.complexity}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 10, color: 'rgba(255,255,255,0.20)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duración típica</div>
                          <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.52)', marginTop: 3 }}>{s.duration}</div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── STEP 1: Parámetros ── */}
          {step === 1 && strategy && (
            <motion.div key="s1" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.22 }}
              style={{ padding: '40px 40px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 28 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: `${strategy.color}14`, border: `1px solid ${strategy.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: strategy.color, flexShrink: 0 }}>
                  {strategy.icon}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, color: strategy.color }}>{strategy.label}</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'rgba(255,255,255,0.34)', marginTop: 4, lineHeight: 1.5 }}>
                    Configurá los parámetros de tu proyecto. Cada campo tiene una explicación para ayudarte a elegir el valor correcto.
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 28 }} className="sim-grid">
                {strategy.params.map(p => (
                  <ParamField key={p.id} p={p} value={params[p.id] ?? p.default} onChange={v => setP(p.id, v)} color={strategy.color}/>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Proyección ── */}
          {step === 2 && strategy && proj && (
            <motion.div key="s2" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.22 }}
              style={{ padding: '40px 40px 28px' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: `${strategy.color}14`, border: `1px solid ${strategy.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: strategy.color, flexShrink: 0 }}>
                  {strategy.icon}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, color: strategy.color }}>{strategy.label} — Proyección</div>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'rgba(255,255,255,0.28)', marginTop: 3 }}>Objetivo: {fmt(params.goal)} · {strategy.badge}</div>
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: `${strategy.color}0b`, border: `1px solid ${strategy.color}28`, borderRadius: 16, padding: '16px 20px', marginBottom: 22 }}>
                <p style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'rgba(255,255,255,0.70)', margin: 0, lineHeight: 1.65 }}>
                  <span style={{ color: strategy.color, fontWeight: 700 }}>Resumen: </span>{proj.summary}
                </p>
              </div>

              {/* Stats grid — 3 cols */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22 }} className="proj-stat-grid">
                {proj.stats.map(s => (
                  <div key={s.key} style={{
                    background: s.highlight ? `${strategy.color}0d` : 'rgba(255,255,255,0.030)',
                    border: `1px solid ${s.highlight ? strategy.color + '35' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 14, padding: '14px 16px',
                    boxShadow: s.highlight ? `0 4px 24px ${strategy.color}12` : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, color: s.highlight ? strategy.color : 'rgba(255,255,255,0.28)' }}>
                      <StatIcon type={s.icon}/>
                      <span style={{ fontFamily: 'var(--font-b)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-h)', fontSize: 21, fontWeight: 800, color: s.highlight ? strategy.color : 'rgba(255,255,255,0.88)', marginBottom: 6 }}>
                      {s.value}
                    </div>
                    <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>
                      {s.note}
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
                {proj.charts.map((c, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '18px 20px 12px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{c.label}</div>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 4, lineHeight: 1.5 }}>{c.subtitle}</div>
                    </div>
                    <MiniChart data={c.data} dataKey={c.key} color={strategy.color} height={90}/>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontFamily: 'var(--font-b)', fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>Inicio</span>
                      <span style={{ fontFamily: 'var(--font-b)', fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>Fin del período</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Escrow milestone timeline */}
              {proj.milestones && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                    Timeline de hitos — cuándo liberás cada tramo de capital
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {proj.milestones.map(m => (
                      <div key={m.n} style={{ flex: 1, minWidth: 90, background: `${strategy.color}0d`, border: `1px solid ${strategy.color}28`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-b)', fontSize: 10, color: `${strategy.color}bb`, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Hito {m.n}</div>
                        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 15, color: 'rgba(255,255,255,0.88)' }}>{fmt(m.amount)}</div>
                        <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 3 }}>Semana {m.week}</div>
                        <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: `${strategy.color}99`, marginTop: 2 }}>+{m.bonus}% bonus</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,0.22)', flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                </svg>
                <p style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'rgba(255,255,255,0.28)', margin: 0, lineHeight: 1.55 }}>
                  Proyección estimada con fines ilustrativos. Los resultados reales dependen del mercado, la demanda y la ejecución del proyecto. No constituye asesoramiento financiero.
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Footer */}
        <div style={{ padding: '16px 40px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.16)' }}>
          <button onClick={() => step > 0 && setStep(s => s - 1)} disabled={step === 0}
            style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.09)', background: 'transparent', cursor: step === 0 ? 'default' : 'pointer', color: step === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.50)', fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, transition: 'all 0.15s' }}>
            ← Atrás
          </button>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === step ? 22 : 6, height: 6, borderRadius: 3, background: i === step ? (strategy?.color || 'rgba(255,255,255,0.75)') : 'rgba(255,255,255,0.10)', transition: 'all 0.3s' }}/>
            ))}
          </div>

          {step < 2 ? (
            <button onClick={goNext} disabled={!canNext} style={{
              padding: '9px 24px', borderRadius: 10, border: 'none',
              background: canNext ? (strategy?.color || 'rgba(255,255,255,0.88)') : 'rgba(255,255,255,0.06)',
              cursor: canNext ? 'pointer' : 'default',
              color: canNext ? '#050505' : 'rgba(255,255,255,0.18)',
              boxShadow: canNext ? `0 0 26px ${strategy?.color || '#ffffff'}66` : 'none',
              fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
            }}>
              {step === 0 ? 'Configurar proyecto →' : 'Ver proyección →'}
            </button>
          ) : (
            <button onClick={reset} style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: strategy?.color, cursor: 'pointer', color: '#050505', fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 700 }}>
              Probar otro modelo →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
