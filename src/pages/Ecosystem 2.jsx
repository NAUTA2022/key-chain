import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaCar, FaBuilding, FaShip, FaMicrochip, FaLeaf, FaIndustry, FaStore, FaTractor, FaArrowRight, FaTimes, FaExternalLinkAlt, FaStar, FaGlobe, FaTwitter, FaLinkedin, FaFilter, FaChevronLeft, FaChevronRight, FaFileAlt, FaShieldAlt, FaBolt, FaCoins, FaLock, FaCheckCircle, FaSortAmountDown, FaSortAmountUp, FaUsers } from 'react-icons/fa';
import { MdApartment, MdSolarPower } from 'react-icons/md';
import { playNodeHover, playNodeSelect, playZoomIn, playZoomOut } from '../lib/sound';

// ─── COLORS ─────────────────────────────────────────────────────────────────
const GOLD = '#c9a84c', AMBER = '#f59e0b', WHITE = '#e2e2e2', BLUE = '#4a9eff', GREEN = '#4ade80', BG = '#060608';

// ─── ICONS ──────────────────────────────────────────────────────────────────
const ICON_MAP = { autos: FaCar, realestate: FaBuilding, containers: FaShip, campo: FaLeaf, tech: FaMicrochip, industria: FaIndustry, comercio: FaStore, agro: FaTractor, energia: MdSolarPower, vivienda: MdApartment };
const ICON_OPTIONS = [
  { key: 'autos', label: 'Automóviles' }, { key: 'realestate', label: 'Real Estate' },
  { key: 'containers', label: 'Contenedores' }, { key: 'campo', label: 'Campo' },
  { key: 'tech', label: 'Tecnología' }, { key: 'industria', label: 'Industria' },
  { key: 'comercio', label: 'Comercio' }, { key: 'agro', label: 'Agro' },
  { key: 'energia', label: 'Energía' }, { key: 'vivienda', label: 'Vivienda' },
];

// ─── CARD METADATA ──────────────────────────────────────────────────────────
const COUNTRY_META = {
  argentina: {
    legal: 'CNV Res. 994/22', tax: '15% ganancias capital', gdp: 'USD 640B', pop: '45M', rating: 'BB-', status: 'Regulado ✓',
    regulation_score: 72, decentralization_score: 58, security_score: 65,
    regulation_detail: 'La CNV regula los activos digitales tokenizados mediante la Res. 994/22, estableciendo requisitos de transparencia, custodia y registro para emisores de tokens RWA. Argentina cuenta con sandbox regulatorio activo para proyectos fintech.',
    docs: [
      { title: 'Resolución CNV 994/22', date: 'Nov 2022', type: 'Regulación' },
      { title: 'Guía Tokenización RWA · CNV', date: 'Mar 2023', type: 'Guía' },
      { title: 'Marco Activos Digitales BCRA', date: 'Ago 2023', type: 'Normativa' },
      { title: 'Ley Fintech 27440', date: 'May 2018', type: 'Ley' },
    ],
  },
  colombia: {
    legal: 'SFC — Circ. 052/21', tax: '10% renta capital', gdp: 'USD 344B', pop: '52M', rating: 'BB+', status: 'Regulado ✓',
    regulation_score: 81, decentralization_score: 52, security_score: 78,
    regulation_detail: 'La SFC (Superintendencia Financiera de Colombia) lidera en LATAM con la Circular 052/21, autorizando pilotos de activos digitales bajo su sandbox. Colombia tiene el marco legal más avanzado para DeFi institucional de la región.',
    docs: [
      { title: 'Circular SFC 052/21', date: 'Oct 2021', type: 'Regulación' },
      { title: 'Decreto 1234/23 Activos Virtuales', date: 'Jul 2023', type: 'Decreto' },
      { title: 'Manual AML/KYC para VASP', date: 'Ene 2024', type: 'Cumplimiento' },
    ],
  },
  panama: {
    legal: 'Ley 23/2015 · Cripto-friendly', tax: '0% offshore', gdp: 'USD 74B', pop: '4.4M', rating: 'BBB', status: 'Hub RWA ✓',
    regulation_score: 88, decentralization_score: 75, security_score: 85,
    regulation_detail: 'Panamá es el hub RWA más atractivo de LATAM: sin impuesto a ganancias offshore, Ley 23/2015 para activos digitales, y el Canal como garantía de demanda logística perpetua. Rating BBB con estabilidad política alta.',
    docs: [
      { title: 'Ley 23/2015 Activos Digitales', date: 'Abr 2015', type: 'Ley' },
      { title: 'Propuesta Ley Cripto 2024', date: 'Feb 2024', type: 'Proyecto' },
      { title: 'Marco Zona Libre Colón · RWA', date: 'Sep 2023', type: 'Guía' },
      { title: 'Tratado DTA · Exención Fiscal', date: 'Dic 2022', type: 'Tratado' },
    ],
  },
};
const CATEGORY_META = {
  autos:      { growth: '+18% anual LAT', legal: 'Ley 27440 + CNV 22/23', benefits: 'Renta mensual, baja volatilidad, respaldo físico', risk: 'Bajo' },
  campo:      { growth: '+22% anual', legal: 'Reg. Prod. Agropecuario', benefits: 'Hedge inflación, activos reales, ciclo estacional', risk: 'Medio' },
  realestate: { growth: '+15% anual', legal: 'Ley 1558 (SFC Colombia)', benefits: 'Apreciación + renta pasiva, liquidez secundaria', risk: 'Bajo' },
  containers: { growth: '+12% anual', legal: 'Ley 23/2015 Panamá', benefits: 'Flujo predecible, demanda global constante', risk: 'Bajo' },
  tech:       { growth: '+35% anual', legal: 'Múltiple jurisdicción', benefits: 'Alto crecimiento, escalable, global', risk: 'Alto' },
};
const COMPANY_META = {
  automax:   {
    apy: 8.5, since: '2022', tokens: 'FLUX-AUTO',
    bio: 'AutoMax tokeniza flotas vehiculares en Argentina con respaldo físico certificado. Pionera en RWA automotriz con +45 vehículos gestionados y $2M en TVL.',
    social: { twitter: '@AutoMaxRWA', linkedin: 'automax-rwa', web: 'automax.io' },
    rating: 4.6,
    reviews: [
      { user: 'Inversor_AR', text: 'Retornos mensuales puntuales, equipo muy transparente.', stars: 5 },
      { user: 'DeFi_Maxi', text: 'Proceso de onboarding simple, buen soporte.', stars: 4 },
      { user: 'TradFi2Web3', text: 'La mejor relación riesgo/retorno en autos LATAM.', stars: 5 },
    ],
    milestones: [
      { year: '2022', label: 'Fundación · Seed $500k' },
      { year: '2023 Q1', label: 'Primera tokenización de flota (10 vehículos)' },
      { year: '2023 Q4', label: '$1M TVL · 200 inversores' },
      { year: '2024', label: '$2M TVL · Integración KEYCHAIN' },
    ],
    bannerBg: `linear-gradient(135deg,#1a0f00,#2a1500)`,
    bannerEmoji: '🚗',
  },
  carrent:   {
    apy: 11.2, since: '2023', tokens: 'CRN',
    bio: 'CarRent Pro opera una red de renta vehicular tokenizada. Cada token CRN representa ingresos de renta diaria con liquidez semanal.',
    social: { twitter: '@CarRentPro', linkedin: 'carrent-pro', web: 'carrent.pro' },
    rating: 4.2,
    reviews: [
      { user: 'Crypto_Rentista', text: 'APY real cumplido mes a mes, muy satisfecho.', stars: 5 },
      { user: 'LAT_Investor', text: 'Buena plataforma, podría mejorar el dashboard.', stars: 4 },
    ],
    milestones: [
      { year: '2023 Q1', label: 'Lanzamiento con 5 vehículos' },
      { year: '2023 Q3', label: 'Expansión a Córdoba y Rosario' },
      { year: '2024', label: '15 vehículos activos · CRN listado' },
    ],
    bannerBg: `linear-gradient(135deg,#0f1a00,#1a2800)`,
    bannerEmoji: '🚙',
  },
  agrichain: {
    apy: 14.0, since: '2021', tokens: 'AGRC',
    bio: 'AgriChain lidera la tokenización de commodities agrícolas en LATAM. Cada token AGRC está respaldado por cosechas verificadas en silos certificados.',
    social: { twitter: '@AgriChainRWA', linkedin: 'agrichain', web: 'agrichain.io' },
    rating: 4.8,
    reviews: [
      { user: 'Agro_DeFi', text: 'El mejor proyecto de su categoría. Auditorías impecables.', stars: 5 },
      { user: 'CampoToken', text: 'Llevo 2 años y siempre paga en tiempo y forma.', stars: 5 },
      { user: 'Inversor_Soja', text: 'Riesgo climático existe, pero bien gestionado.', stars: 4 },
    ],
    milestones: [
      { year: '2021', label: 'Fundación · $1M seed' },
      { year: '2022', label: 'Primera cosecha tokenizada (5000 tn soja)' },
      { year: '2023', label: '$5M TVL · Certificación ISO auditores' },
      { year: '2024', label: '$12M TVL · AGRC en 3 exchanges DEX' },
    ],
    bannerBg: `linear-gradient(135deg,#001a00,#0a2800)`,
    bannerEmoji: '🌾',
  },
  tierratok: {
    apy: 12.5, since: '2023', tokens: 'TTTK',
    bio: 'TierraTok fracciona tierra productiva en tokens TTTK. Acceso a campos de alto rendimiento desde $2,000 USDC con retornos en stablecoins.',
    social: { twitter: '@TierraTok', linkedin: 'tierratok', web: 'tierratok.ar' },
    rating: 4.1,
    reviews: [
      { user: 'LandFi_AR', text: 'Primer año excelente, esperando el segundo ciclo.', stars: 4 },
      { user: 'RWA_Hawk', text: 'Documentación legal muy sólida.', stars: 5 },
    ],
    milestones: [
      { year: '2023 Q2', label: 'Lanzamiento · 500ha tokenizadas' },
      { year: '2023 Q4', label: 'Primer ciclo de cosecha exitoso' },
      { year: '2024', label: '1,500ha · Expansión Córdoba y Entre Ríos' },
    ],
    bannerBg: `linear-gradient(135deg,#001500,#002800)`,
    bannerEmoji: '🌿',
  },
  propchain: {
    apy: 9.8, since: '2022', tokens: 'PROP',
    bio: 'PropChain es la plataforma líder de real estate tokenizado en Colombia. Fracciona apartamentos en Bogotá, Medellín y Cartagena desde $500 USDC.',
    social: { twitter: '@PropChainCO', linkedin: 'propchain-colombia', web: 'propchain.co' },
    rating: 4.5,
    reviews: [
      { user: 'Bogota_RE', text: 'Invirtiendo en finca raíz nunca fue tan fácil.', stars: 5 },
      { user: 'MedellínDeFi', text: 'Transparencia total, reportes mensuales detallados.', stars: 4 },
      { user: 'COL_Investor', text: 'El equipo responde rápido ante cualquier duda.', stars: 5 },
    ],
    milestones: [
      { year: '2022', label: 'Primer apartamento tokenizado · Bogotá' },
      { year: '2023 Q2', label: 'Regulación SFC · Sandbox aprobado' },
      { year: '2023 Q4', label: '$3M TVL · 8 propiedades activas' },
      { year: '2024', label: '$7M TVL · Medellín + Cartagena' },
    ],
    bannerBg: `linear-gradient(135deg,#001020,#001832)`,
    bannerEmoji: '🏢',
  },
  seatoken:  {
    apy: 8.0, since: '2021', tokens: 'SEA',
    bio: 'SeaToken tokeniza contenedores marítimos en el Hub de Panamá. Renta fija mensual respaldada por contratos de arrendamiento de largo plazo.',
    social: { twitter: '@SeaTokenPAN', linkedin: 'seatoken', web: 'seatoken.io' },
    rating: 4.7,
    reviews: [
      { user: 'ShippingFi', text: 'Demanda de contenedores es constante. Retorno seguro.', stars: 5 },
      { user: 'Canal_Investor', text: 'La mejor forma de invertir en logística global.', stars: 5 },
      { user: 'PanamaDeFi', text: 'Ya van 3 años y nunca faltó un pago.', stars: 5 },
    ],
    milestones: [
      { year: '2021', label: 'Lanzamiento · 20 contenedores 20ft' },
      { year: '2022', label: 'Expansión a contenedores 40ft · $1M TVL' },
      { year: '2023', label: '$4M TVL · 150 contenedores activos' },
      { year: '2024', label: 'Integración Canal de Panamá · $8M TVL' },
    ],
    bannerBg: `linear-gradient(135deg,#000d20,#001836)`,
    bannerEmoji: '🚢',
  },
  navichain: {
    apy: 7.5, since: '2023', tokens: 'NAVI',
    bio: 'NaviChain gestiona carga a granel tokenizada, conectando exportadores agrícolas de LATAM con inversores globales vía blockchain.',
    social: { twitter: '@NaviChainRWA', linkedin: 'navichain', web: 'navichain.io' },
    rating: 3.9,
    reviews: [
      { user: 'BulkCargo_FI', text: 'Proyecto sólido, todavía en etapa temprana.', stars: 4 },
      { user: 'LogDeFi', text: 'Buenas perspectivas, pendiente de más track record.', stars: 4 },
    ],
    milestones: [
      { year: '2023 Q3', label: 'Lanzamiento · Primera carga tokenizada' },
      { year: '2023 Q4', label: 'NAVI listado en DEX · $500k TVL' },
      { year: '2024', label: '$1.5M TVL · Acuerdo con exportadora AR' },
    ],
    bannerBg: `linear-gradient(135deg,#00101a,#001c2e)`,
    bannerEmoji: '⚓',
  },
};
const PROJECT_META = {
  'am-fleet': {
    apy: 8.5, min: 500, dur: '24m', type: 'Flota Vehicular RWA', status: 'Activo', filled: 78,
    description: 'Flota de 45 vehículos gestionados y tokenizados con respaldo físico certificado. Renta mensual distribuida en USDC cada 30 días. Contratos de arrendamiento operativo de 24 meses.',
    trust_score: 85, security_score: 82, decentralization_score: 60,
    photos: [{ emoji:'🚗', label:'Flota Principal', bg:'#1a0a00' },{ emoji:'🏭', label:'Centro de Operaciones', bg:'#0d1400' },{ emoji:'📋', label:'Certificación Legal', bg:'#0a0a1a' }],
    tokenomics: { supply:'500,000 FLUX', price:'$1 USDC', holders:'312', liquidity:'$180k', distribution:[['Inversores','80%'],['Reserva Operativa','12%'],['Equipo','8%']] },
    docs: [{ title:'Prospecto de Inversión FLEET-24', type:'PDF' },{ title:'Auditoría EY — Q1 2024', type:'PDF' },{ title:'Certificado de Titularidad Vehicular', type:'Legal' }],
  },
  'am-loans': {
    apy: 12.0, min: 200, dur: '12m', type: 'Crédito Auto-colateralizado', status: 'Activo', filled: 91,
    description: 'Créditos colateralizados con vehículos físicos. LTV máximo 70%. Score crediticio mínimo 650. Mora histórica <2.1%. Los fondos se prestan a compradores verificados con respaldo del activo.',
    trust_score: 91, security_score: 88, decentralization_score: 55,
    photos: [{ emoji:'💳', label:'Proceso de Crédito', bg:'#1a1a00' },{ emoji:'🔒', label:'Colateral Verificado', bg:'#001a10' }],
    tokenomics: { supply:'200,000 LOAN', price:'$1 USDC', holders:'528', liquidity:'$95k', distribution:[['Pool de Crédito','85%'],['Reserva de Mora','10%'],['Gestión','5%']] },
    docs: [{ title:'Reglamento de Crédito LOANS-12', type:'PDF' },{ title:'Informe Mora Q4 2023', type:'Reporte' },{ title:'Marco Legal CNV — Crédito Digital', type:'Legal' }],
  },
  'cr-token': {
    apy: 11.2, min: 300, dur: '18m', type: 'Renta de vehículos', status: 'Activo', filled: 55,
    description: 'Renta diaria de flota vehicular tokenizada. Ingresos de alquiler distribuidos semanalmente. 15 vehículos activos en CABA y Córdoba con ocupación promedio 78%.',
    trust_score: 72, security_score: 70, decentralization_score: 58,
    photos: [{ emoji:'🚙', label:'Flota de Renta', bg:'#0d1a00' },{ emoji:'📍', label:'Cobertura Geográfica', bg:'#001a1a' },{ emoji:'📈', label:'Métricas de Ocupación', bg:'#1a001a' }],
    tokenomics: { supply:'300,000 CRN', price:'$1 USDC', holders:'187', liquidity:'$62k', distribution:[['Pool Renta','75%'],['Mantenimiento','15%'],['Equipo','10%']] },
    docs: [{ title:'Prospecto CRN-18', type:'PDF' },{ title:'Contratos de Arrendamiento', type:'Legal' }],
  },
  'ag-soy': {
    apy: 14.0, min: 1000, dur: '6m', type: 'Cosecha Soja RWA', status: 'Activo', filled: 88,
    description: 'Tokenización de 5,000 toneladas de soja almacenadas en silos certificados en Santa Fe. Precio fijado a futuro. Auditoría de stock mensual por PwC. El activo más demandado del ecosistema.',
    trust_score: 92, security_score: 90, decentralization_score: 62,
    photos: [{ emoji:'🌱', label:'Siembra Certificada', bg:'#001a00' },{ emoji:'🏗️', label:'Silo Autorizado CNV', bg:'#001400' },{ emoji:'⚖️', label:'Pesaje y Control', bg:'#0a1400' },{ emoji:'📦', label:'Stock Tokenizado', bg:'#141400' }],
    tokenomics: { supply:'1,000,000 AGRC-SOY', price:'$1 USDC', holders:'445', liquidity:'$420k', distribution:[['Cosecha Real','90%'],['Seguro Climático','6%'],['Gestión','4%']] },
    docs: [{ title:'Prospecto AGRC-SOY-6M', type:'PDF' },{ title:'Auditoría PwC Stock Soja', type:'Auditoría' },{ title:'Póliza Seguro Climático Mapfre', type:'Seguro' },{ title:'Certificado SENASA', type:'Certificación' }],
  },
  'ag-corn': {
    apy: 10.5, min: 500, dur: '6m', type: 'Cosecha Maíz RWA', status: 'Lanzando', filled: 34,
    description: 'Segunda cosecha tokenizada de AgriChain. 3,000 tn de maíz de la campaña 2024/25. Período de captación activo. Cierre en 60 días. Entrega de rendimientos al final del ciclo.',
    trust_score: 78, security_score: 75, decentralization_score: 60,
    photos: [{ emoji:'🌽', label:'Cultivo 2024/25', bg:'#1a1400' },{ emoji:'🚜', label:'Maquinaria Propia', bg:'#141a00' }],
    tokenomics: { supply:'500,000 AGRC-CORN', price:'$1 USDC', holders:'134', liquidity:'$38k', distribution:[['Cosecha Real','88%'],['Seguro Climático','7%'],['Gestión','5%']] },
    docs: [{ title:'Prospecto AGRC-CORN-6M', type:'PDF' },{ title:'Proyección Cosecha 2024', type:'Reporte' }],
  },
  'tt-land': {
    apy: 12.5, min: 2000, dur: '36m', type: 'Tierra Productiva', status: 'Activo', filled: 62,
    description: '500 hectáreas de tierra agrícola de alta productividad en Entre Ríos, Argentina. Arrendamiento a productor AAA con garantía hipotecaria. Renta semestral en USDC.',
    trust_score: 80, security_score: 85, decentralization_score: 48,
    photos: [{ emoji:'🌿', label:'Campo Principal', bg:'#001a00' },{ emoji:'🗺️', label:'Vista Satelital', bg:'#001400' },{ emoji:'📜', label:'Escrituras Digitalizadas', bg:'#0a0a14' }],
    tokenomics: { supply:'250,000 TTTK', price:'$2 USDC', holders:'98', liquidity:'$210k', distribution:[['Tierra Real','85%'],['Operaciones','10%'],['Equipo','5%']] },
    docs: [{ title:'Escritura Pública Digitalizada', type:'Legal' },{ title:'Tasación Oficial CAME', type:'Valuación' },{ title:'Contrato de Arrendamiento', type:'Legal' }],
  },
  'pc-apt': {
    apy: 9.8, min: 500, dur: '24m', type: 'Apartamentos tokenizados', status: 'Activo', filled: 73,
    description: '12 apartamentos tokenizados en Bogotá Norte y El Poblado Medellín. Renta mensual + apreciación de capital al vencimiento. Administración profesional incluida.',
    trust_score: 83, security_score: 80, decentralization_score: 52,
    photos: [{ emoji:'🏠', label:'Aptos Bogotá Norte', bg:'#001020' },{ emoji:'🌆', label:'Medellín El Poblado', bg:'#000d1a' },{ emoji:'🛋️', label:'Interior Tipo', bg:'#0a0014' }],
    tokenomics: { supply:'400,000 PROP-APT', price:'$1 USDC', holders:'267', liquidity:'$155k', distribution:[['Inmuebles','80%'],['Administración','12%'],['Equipo','8%']] },
    docs: [{ title:'Prospecto PROP-APT-24', type:'PDF' },{ title:'Certificado SFC Sandbox', type:'Regulación' },{ title:'Avalúo Lonja Propiedad Raíz', type:'Valuación' }],
  },
  'pc-com': {
    apy: 7.5, min: 1000, dur: '36m', type: 'Oficinas comerciales', status: 'Activo', filled: 45,
    description: 'Portafolio de oficinas class A en Bogotá Financial District. Arrendatarios corporativos con contratos a 36 meses. Renta trimestral estable.',
    trust_score: 70, security_score: 78, decentralization_score: 44,
    photos: [{ emoji:'🏢', label:'Torre Financiera', bg:'#00101a' },{ emoji:'💼', label:'Espacios Corporativos', bg:'#001018' }],
    tokenomics: { supply:'300,000 PROP-COM', price:'$1 USDC', holders:'112', liquidity:'$88k', distribution:[['Inmuebles','82%'],['Administración','10%'],['Reserva','8%']] },
    docs: [{ title:'Prospecto PROP-COM-36', type:'PDF' },{ title:'Contratos Arrendatarios', type:'Legal' }],
  },
  'st-20': {
    apy: 8.0, min: 2000, dur: '12m', type: 'Contenedor 20ft RWA', status: 'Activo', filled: 90,
    description: '80 contenedores de 20 pies tokenizados en el Puerto de Balboa, Panamá. Arrendamiento a navieras tier-1. Demanda garantizada por contratos de 12 meses renovables.',
    trust_score: 94, security_score: 92, decentralization_score: 70,
    photos: [{ emoji:'📦', label:'Contenedores 20ft', bg:'#00101a' },{ emoji:'⚓', label:'Puerto de Balboa', bg:'#000d20' },{ emoji:'🌊', label:'Operaciones Canal', bg:'#001020' }],
    tokenomics: { supply:'160,000 SEA-20', price:'$1 USDC', holders:'356', liquidity:'$195k', distribution:[['Contenedores','85%'],['Seguro Marítimo','8%'],['Gestión','7%']] },
    docs: [{ title:'Prospecto SEA-20-12M', type:'PDF' },{ title:'Contratos Naviera MSC', type:'Legal' },{ title:"Póliza Lloyd's of London", type:'Seguro' }],
  },
  'st-40': {
    apy: 9.0, min: 3000, dur: '12m', type: 'Contenedor 40ft RWA', status: 'Activo', filled: 67,
    description: '40 contenedores de 40 pies en rutas de alto volumen Asia-LATAM. Mayor capacidad y renta por unidad. Contratos con Maersk y CMA-CGM.',
    trust_score: 87, security_score: 88, decentralization_score: 68,
    photos: [{ emoji:'🚢', label:'Ruta Asia-LATAM', bg:'#000d20' },{ emoji:'📦', label:'Contenedores 40ft', bg:'#001020' }],
    tokenomics: { supply:'120,000 SEA-40', price:'$1 USDC', holders:'203', liquidity:'$145k', distribution:[['Contenedores','83%'],['Seguro','9%'],['Gestión','8%']] },
    docs: [{ title:'Prospecto SEA-40-12M', type:'PDF' },{ title:'Contratos Maersk / CMA-CGM', type:'Legal' }],
  },
  'nc-bulk': {
    apy: 7.5, min: 5000, dur: '18m', type: 'Carga a granel', status: 'Activo', filled: 48,
    description: 'Tokenización de operaciones de carga a granel (soja, maíz, trigo) en rutas LATAM-Asia. Naviero exclusivo con flota propia de 3 graneleros.',
    trust_score: 65, security_score: 72, decentralization_score: 58,
    photos: [{ emoji:'⚓', label:'Puerto Granelero', bg:'#00101a' },{ emoji:'🌾', label:'Carga Agrícola', bg:'#001400' }],
    tokenomics: { supply:'100,000 NAVI-BLK', price:'$1 USDC', holders:'78', liquidity:'$62k', distribution:[['Operaciones','80%'],['Reserva','12%'],['Equipo','8%']] },
    docs: [{ title:'Prospecto NAVI-BLK-18M', type:'PDF' },{ title:'Certificado IMO Granelero', type:'Certificación' }],
  },
};

// ─── INITIAL DATA ────────────────────────────────────────────────────────────
const INITIAL_DATA = {
  countries: [
    { id: 'argentina', name: 'Argentina', flag: '🇦🇷', angleOffset: 0.1, radiusOffset: 0, categories: [
      { id: 'autos', name: 'Automóviles', icon: 'autos', angleOffset: 0.12, radiusOffset: -10, companies: [
        { id: 'automax',  name: 'AutoMax',     projects: [{ id: 'am-fleet', name: 'Fleet RWA' }, { id: 'am-loans', name: 'Auto Loans' }] },
        { id: 'carrent',  name: 'CarRent Pro', projects: [{ id: 'cr-token', name: 'Token Renta' }] },
      ]},
      { id: 'campo', name: 'Campo', icon: 'campo', angleOffset: -0.1, radiusOffset: 5, companies: [
        { id: 'agrichain', name: 'AgriChain', projects: [{ id: 'ag-soy', name: 'Soja Token' }, { id: 'ag-corn', name: 'Maíz RWA' }] },
        { id: 'tierratok', name: 'TierraTok', projects: [{ id: 'tt-land', name: 'Tierra Prod.' }] },
      ]},
    ]},
    { id: 'colombia', name: 'Colombia', flag: '🇨🇴', angleOffset: -0.08, radiusOffset: 8, categories: [
      { id: 'realestate', name: 'Real Estate', icon: 'realestate', angleOffset: 0, radiusOffset: 0, companies: [
        { id: 'propchain', name: 'PropChain', projects: [{ id: 'pc-apt', name: 'Aptos RWA' }, { id: 'pc-com', name: 'Comercial' }] },
      ]},
    ]},
    { id: 'panama', name: 'Panamá', flag: '🇵🇦', angleOffset: 0.2, radiusOffset: -5, categories: [
      { id: 'containers', name: 'Contenedores', icon: 'containers', angleOffset: 0.05, radiusOffset: 0, companies: [
        { id: 'seatoken',  name: 'SeaToken',  projects: [{ id: 'st-20', name: 'Container 20ft' }, { id: 'st-40', name: 'Container 40ft' }] },
        { id: 'navichain', name: 'NaviChain', projects: [{ id: 'nc-bulk', name: 'Bulk Cargo' }] },
      ]},
    ]},
  ],
};

// ─── GEOMETRY ────────────────────────────────────────────────────────────────
const hexPoints = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 6;
  return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
}).join(' ');
const triPoints = (cx, cy, r) => `${cx},${cy - r} ${cx + r * 0.866},${cy + r * 0.5} ${cx - r * 0.866},${cy + r * 0.5}`;

// ─── COLLIDER RADIUS PER NODE ─────────────────────────────────────────────
function colliderRNode(node) {
  if (node.type === 'core')     return 110;
  if (node.type === 'country')  return 88 + (node.data?.categories?.length || 0) * 38;
  if (node.type === 'category') return 52 + (node.data?.companies?.length || 0) * 24;
  if (node.type === 'company')  return 32 + (node.data?.projects?.length || 0) * 14;
  return 18;
}

// ─── PHYSICS SIMULATION ───────────────────────────────────────────────────
function runSimulation(nodes, iterations = 90) {
  // El núcleo es fijo en (0,0) y repele a todos los demás
  const coreNode = { id: '__core__', type: 'core', x: 0, y: 0, fixed: true, data: {} };
  const all = [coreNode, ...nodes];
  const off = {}, vel = {};
  all.forEach(n => { off[n.id] = { x: 0, y: 0 }; vel[n.id] = { x: 0, y: 0 }; });

  for (let iter = 0; iter < iterations; iter++) {
    for (let a = 0; a < all.length; a++) {
      for (let b = a + 1; b < all.length; b++) {
        const na = all[a], nb = all[b];
        const ax = na.x + off[na.id].x, ay = na.y + off[na.id].y;
        const bx = nb.x + off[nb.id].x, by = nb.y + off[nb.id].y;
        const dx = ax - bx, dy = ay - by;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minD = colliderRNode(na) + colliderRNode(nb) + 14;
        if (dist < minD) {
          const f = (minD - dist) / dist * 0.38;
          if (!na.fixed) { vel[na.id].x += dx * f; vel[na.id].y += dy * f; }
          if (!nb.fixed) { vel[nb.id].x -= dx * f; vel[nb.id].y -= dy * f; }
        }
      }
    }
    all.forEach(n => {
      if (n.fixed) return;
      vel[n.id].x -= off[n.id].x * 0.07;
      vel[n.id].y -= off[n.id].y * 0.07;
      vel[n.id].x *= 0.74; vel[n.id].y *= 0.74;
      off[n.id].x += vel[n.id].x;
      off[n.id].y += vel[n.id].y;
    });
  }
  const result = {};
  nodes.forEach(n => { result[n.id] = off[n.id]; });
  return result;
}

// ─── BUILD GRAPH ─────────────────────────────────────────────────────────────
function buildGraph(data, offsets = {}) {
  const nodes = [], edges = [];

  data.countries.forEach((country, ci) => {
    const baseAngle = (ci / data.countries.length) * 2 * Math.PI - Math.PI / 2;
    const cAngle = baseAngle + (country.angleOffset || 0);
    const cR = 160 + (country.radiusOffset || 0);
    const cX = Math.cos(cAngle) * cR + (offsets[country.id]?.x || 0);
    const cY = Math.sin(cAngle) * cR + (offsets[country.id]?.y || 0);

    nodes.push({ type: 'country', id: country.id, name: country.name, flag: country.flag, x: cX, y: cY, data: country });
    edges.push({ x1: 0, y1: 0, x2: cX, y2: cY, tier: 'core' });

    const numCats = country.categories.length;
    country.categories.forEach((cat, ki) => {
      const catSpread = numCats > 1 ? 0.44 : 0;
      const catAngle = cAngle + (ki - (numCats - 1) / 2) * catSpread + (cat.angleOffset || 0);
      const catR = 282 + (cat.radiusOffset || 0) + (ki % 2 === 0 ? 8 : -8);
      const catNodeId = cat.id + '_' + country.id;
      const catX = Math.cos(catAngle) * catR + (offsets[catNodeId]?.x || 0);
      const catY = Math.sin(catAngle) * catR + (offsets[catNodeId]?.y || 0);

      nodes.push({ type: 'category', id: catNodeId, name: cat.name, icon: cat.icon, x: catX, y: catY, data: cat, countryId: country.id, countryName: country.name, countryFlag: country.flag });
      edges.push({ x1: cX, y1: cY, x2: catX, y2: catY, tier: 'country' });

      const numComp = cat.companies.length;
      cat.companies.forEach((comp, cj) => {
        const compAngle = catAngle + (cj - (numComp - 1) / 2) * (0.3 + (cj % 2) * 0.05);
        const compR = 402 + (cj % 2 === 0 ? 14 : -12);
        const compX = Math.cos(compAngle) * compR + (offsets[comp.id]?.x || 0);
        const compY = Math.sin(compAngle) * compR + (offsets[comp.id]?.y || 0);

        nodes.push({ type: 'company', id: comp.id, name: comp.name, x: compX, y: compY, data: comp, catId: cat.id, catName: cat.name, countryName: country.name, countryFlag: country.flag });
        edges.push({ x1: catX, y1: catY, x2: compX, y2: compY, tier: 'sub' });

        comp.projects.forEach((proj, pj) => {
          const projAngle = compAngle + (pj - (comp.projects.length - 1) / 2) * 0.22;
          const projR = 532 + (pj % 2 === 0 ? 14 : 0);
          const projX = Math.cos(projAngle) * projR + (offsets[proj.id]?.x || 0);
          const projY = Math.sin(projAngle) * projR + (offsets[proj.id]?.y || 0);

          nodes.push({ type: 'project', id: proj.id, name: proj.name, x: projX, y: projY, data: proj, compName: comp.name, compId: comp.id, catName: cat.name, countryFlag: country.flag });
          edges.push({ x1: compX, y1: compY, x2: projX, y2: projY, tier: 'leaf' });
        });
      });
    });
  });
  return { nodes, edges };
}

const uid = () => Math.random().toString(36).slice(2, 8);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Ecosystem({ nav }) {
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const pinchDist = useRef(null);
  const animFrameRef = useRef(null);

  const [data, setData] = useState(INITIAL_DATA);
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [offsets, setOffsets] = useState({});
  const [card, setCard] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState('country');
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [form, setForm] = useState({
    country:  { name: '', flag: '🇺🇸' },
    category: { name: '', icon: 'autos', countryId: '' },
    company:  { name: '', categoryId: '' },
    project:  { name: '', companyId: '' },
  });

  useEffect(() => {
    const { nodes } = buildGraph(data, {});
    setOffsets(runSimulation(nodes));
  }, [data]);

  useEffect(() => {
    const fn = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => { e.preventDefault(); if (!card) { (e.deltaY < 0 ? playZoomIn : playZoomOut)(); setZoom(z => Math.min(Math.max(z * (e.deltaY < 0 ? 1.1 : 0.9), 0.1), 6)); } };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [card]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fn = (e) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (pinchDist.current !== null) setZoom(z => Math.min(Math.max(z * dist / pinchDist.current, 0.1), 6));
        pinchDist.current = dist;
      } else if (e.touches.length === 1 && dragging.current && !card) {
        setPan({ x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y });
      }
    };
    el.addEventListener('touchmove', fn, { passive: false });
    return () => el.removeEventListener('touchmove', fn);
  }, [card]);

  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }, []);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0 || card) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan, card]);
  const onMouseMove = useCallback((e) => { if (!dragging.current) return; setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); }, []);
  const stopDrag = useCallback(() => { dragging.current = false; }, []);

  function animateTo(targetPan, targetZoom, onDone) {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    let cp = { x: pan.x, y: pan.y }, cz = zoom;
    const step = () => {
      const S = 0.13;
      cp = { x: cp.x + (targetPan.x - cp.x) * S, y: cp.y + (targetPan.y - cp.y) * S };
      cz += (targetZoom - cz) * S;
      setPan({ ...cp }); setZoom(cz);
      if (Math.abs(targetPan.x - cp.x) < 0.5 && Math.abs(targetPan.y - cp.y) < 0.5 && Math.abs(targetZoom - cz) < 0.003) {
        setPan(targetPan); setZoom(targetZoom); onDone?.();
      } else {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };
    animFrameRef.current = requestAnimationFrame(step);
  }

  const ZOOM_LEVELS = { country: 2.0, category: 2.6, company: 3.2, project: 4.0 };

  function handleNodeClick(node) {
    if (card?.node.id === node.id) { closeCard(); return; }
    playNodeSelect();
    playZoomIn();
    const tz = ZOOM_LEVELS[node.type] || 2.0;
    setCard({ node });
    animateTo({ x: -node.x * tz, y: -node.y * tz }, tz);
  }

  function handleCoreClick() {
    if (card?.node?.id === 'keychain') { closeCard(); return; }
    playNodeSelect();
    playZoomIn();
    const coreNode = { id: 'keychain', type: 'core', name: 'KEYCHAIN', x: 0, y: 0 };
    setCard({ node: coreNode });
    animateTo({ x: 0, y: 0 }, 2.0);
  }

  function closeCard() {
    playZoomOut();
    setCard(null);
    animateTo({ x: 0, y: 0 }, 0.72);
  }

  const addCountry = () => {
    if (!form.country.name.trim()) return;
    setData(d => ({ ...d, countries: [...d.countries, { id: uid(), name: form.country.name.trim(), flag: form.country.flag, angleOffset: (Math.random()-0.5)*0.4, radiusOffset: Math.floor((Math.random()-0.5)*20), categories: [] }] }));
    setForm(f => ({ ...f, country: { name: '', flag: '🇺🇸' } }));
  };
  const addCategory = () => {
    if (!form.category.name.trim() || !form.category.countryId) return;
    const nc = { id: uid(), name: form.category.name.trim(), icon: form.category.icon, angleOffset: (Math.random()-0.5)*0.2, radiusOffset: Math.floor((Math.random()-0.5)*15), companies: [] };
    setData(d => ({ ...d, countries: d.countries.map(c => c.id === form.category.countryId ? { ...c, categories: [...c.categories, nc] } : c) }));
    setForm(f => ({ ...f, category: { ...f.category, name: '' } }));
  };
  const addCompany = () => {
    if (!form.company.name.trim() || !form.company.categoryId) return;
    const [catId, countryId] = form.company.categoryId.split('::');
    const nc = { id: uid(), name: form.company.name.trim(), projects: [] };
    setData(d => ({ ...d, countries: d.countries.map(c => c.id === countryId ? { ...c, categories: c.categories.map(cat => cat.id === catId ? { ...cat, companies: [...cat.companies, nc] } : cat) } : c) }));
    setForm(f => ({ ...f, company: { ...f.company, name: '' } }));
  };
  const addProject = () => {
    if (!form.project.name.trim() || !form.project.companyId) return;
    const [compId, catId, countryId] = form.project.companyId.split('::');
    const np = { id: uid(), name: form.project.name.trim() };
    setData(d => ({ ...d, countries: d.countries.map(c => c.id === countryId ? { ...c, categories: c.categories.map(cat => cat.id === catId ? { ...cat, companies: cat.companies.map(comp => comp.id === compId ? { ...comp, projects: [...comp.projects, np] } : comp) } : cat) } : c) }));
    setForm(f => ({ ...f, project: { ...f.project, name: '' } }));
  };

  const graph = buildGraph(data, offsets);
  const cx = vp.w / 2 + pan.x, cy = vp.h / 2 + pan.y;
  const allCategories = data.countries.flatMap(c => c.categories.map(cat => ({ id: `${cat.id}::${c.id}`, label: `${cat.name} (${c.name})` })));
  const allCompanies  = data.countries.flatMap(c => c.categories.flatMap(cat => cat.companies.map(comp => ({ id: `${comp.id}::${cat.id}::${c.id}`, label: `${comp.name} (${cat.name})` }))));

  return (
    <div style={{ position:'absolute', inset:0, background:BG, overflow:'hidden', fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>

      {/* CANVAS */}
      <div ref={containerRef}
        style={{ position:'absolute', inset:0, overflow:'hidden', cursor: card ? 'default' : 'grab', userSelect:'none', touchAction:'none' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={stopDrag} onMouseLeave={stopDrag}
        onTouchStart={e => {
          if (e.touches.length===2) { const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY; pinchDist.current=Math.sqrt(dx*dx+dy*dy); }
          else if (!card) { dragging.current=true; dragStart.current={x:e.touches[0].clientX-pan.x,y:e.touches[0].clientY-pan.y}; }
        }}
        onTouchEnd={() => { dragging.current=false; pinchDist.current=null; }}
      >
        <svg width="100%" height="100%" style={{ display:'block' }}>
          <defs>
            <style>{`
              @keyframes pulse-core { 0%{opacity:.55;transform:scale(1)} 100%{opacity:0;transform:scale(1.55)} }
              @keyframes pulse-node { 0%{opacity:.65;transform:scale(1)} 100%{opacity:0;transform:scale(1.7)} }
              .pc1{animation:pulse-core 2s ease-out infinite;transform-origin:center;transform-box:fill-box}
              .pc2{animation:pulse-core 2s ease-out .7s infinite;transform-origin:center;transform-box:fill-box}
              .pn1{animation:pulse-node 1.6s ease-out infinite;transform-origin:center;transform-box:fill-box}
              .pn2{animation:pulse-node 1.6s ease-out .55s infinite;transform-origin:center;transform-box:fill-box}
            `}</style>
            <filter id="glow-gold" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow-amber" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow-white" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow-blue" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow-green" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <radialGradient id="grad-bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#12100a" stopOpacity="0.85"/><stop offset="100%" stopColor={BG} stopOpacity="0"/></radialGradient>
            <radialGradient id="grad-core"><stop offset="0%" stopColor="#2a1e00"/><stop offset="100%" stopColor="#020100"/></radialGradient>
            <radialGradient id="grad-country"><stop offset="0%" stopColor="#1e1400"/><stop offset="100%" stopColor="#060400"/></radialGradient>
            <radialGradient id="grad-cat"><stop offset="0%" stopColor="#181818"/><stop offset="100%" stopColor="#080808"/></radialGradient>
            <radialGradient id="grad-comp"><stop offset="0%" stopColor="#061420"/><stop offset="100%" stopColor="#020608"/></radialGradient>
            <radialGradient id="grad-proj"><stop offset="0%" stopColor="#041208"/><stop offset="100%" stopColor="#020402"/></radialGradient>
          </defs>

          <ellipse cx={cx} cy={cy} rx={560*zoom} ry={420*zoom} fill="url(#grad-bg)"/>
          {[60,120,167,244,294,412,545].map((r,i) => (
            <circle key={i} cx={cx} cy={cy} r={r*zoom} fill="none" stroke={GOLD}
              strokeWidth={(i%3===0?0.7:0.25)*Math.min(zoom,1.4)} strokeOpacity={i%3===0?0.2:0.07}
              strokeDasharray={i%2===1?`${4*zoom} ${8*zoom}`:'none'}/>
          ))}
          {[167,294].map((r,ri) => Array.from({length:48},(_,i) => {
            const a=(i/48)*2*Math.PI, maj=i%8===0;
            return <line key={`${ri}-${i}`} x1={cx+Math.cos(a)*r*zoom} y1={cy+Math.sin(a)*r*zoom} x2={cx+Math.cos(a)*(r+(maj?11:5))*zoom} y2={cy+Math.sin(a)*(r+(maj?11:5))*zoom} stroke={GOLD} strokeWidth={(maj?0.7:0.3)*Math.min(zoom,1.4)} strokeOpacity={maj?0.3:0.12}/>;
          }))}

          <g transform={`translate(${cx},${cy}) scale(${zoom})`}>
            {/* Collider orbit rings */}
            {graph.nodes.map(node => {
              if (node.type === 'project') return null;
              const r = colliderRNode(node);
              const color = node.type==='country' ? AMBER : node.type==='category' ? WHITE : BLUE;
              return (
                <g key={`coll-${node.id}`}>
                  {node.type==='country' && <circle cx={node.x} cy={node.y} r={r} fill={AMBER} fillOpacity={0.015} stroke="none"/>}
                  <circle cx={node.x} cy={node.y} r={r} fill="none" stroke={color} strokeWidth={0.5} strokeOpacity={0.1} strokeDasharray="3 9"/>
                </g>
              );
            })}

            {/* Edges */}
            {graph.edges.map((e,i) => {
              const color = e.tier==='core'?GOLD:e.tier==='country'?AMBER:e.tier==='sub'?BLUE:GREEN;
              const op = e.tier==='core'?0.6:e.tier==='country'?0.45:e.tier==='sub'?0.35:0.22;
              const w = e.tier==='core'?1.2:e.tier==='country'?0.9:e.tier==='sub'?0.7:0.45;
              return <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={color} strokeWidth={w} strokeOpacity={op} strokeLinecap="round"/>;
            })}

            {/* Nodes */}
            {graph.nodes.map(node => <NodeShape key={node.id} node={node} active={card?.node.id===node.id} onSelect={handleNodeClick}/>)}

            {/* Core */}
            <CoreHex active={card?.node?.id==='keychain'} onSelect={handleCoreClick}/>
          </g>
        </svg>

        {/* Title pill */}
        <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:8, background:'#0a0a0ecc', border:`1px solid ${GOLD}18`, borderRadius:20, padding:'5px 16px', backdropFilter:'blur(12px)', pointerEvents:'none', whiteSpace:'nowrap' }}>
          <span style={{ color:GOLD, fontSize:8, letterSpacing:3, fontWeight:800, textTransform:'uppercase', opacity:0.55 }}>Factoract</span>
          <span style={{ color:'#333', fontSize:10 }}>·</span>
          <span style={{ color:'#666', fontSize:8, letterSpacing:2, textTransform:'uppercase' }}>Red Neuronal del Ecosistema</span>
        </div>

        {/* Legend card — top left */}
        <div style={{ position:'absolute', top:14, left:16, display:'flex', flexDirection:'column', gap:5, background:'#0a0a0ecc', border:`1px solid #ffffff0a`, borderRadius:12, padding:'10px 14px', backdropFilter:'blur(12px)', pointerEvents:'none' }}>
          {[[GOLD,'⬡','Núcleo'],[AMBER,'⬡','País'],[WHITE,'◼','Categoría'],[BLUE,'●','Empresa'],[GREEN,'▲','Proyecto']].map(([c,s,l]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:12, color:c, opacity:0.8 }}>{s}</span>
              <span style={{ color:'#888', fontSize:8.5, letterSpacing:0.3 }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Zoom + filter controls — right center */}
        <div style={{ position:'absolute', top:'50%', right:16, transform:'translateY(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:4, background:'#0a0a0ecc', border:`1px solid #ffffff0d`, borderRadius:14, padding:'10px 6px', backdropFilter:'blur(12px)' }}>
          {[['+',()=>{playZoomIn();setZoom(z=>Math.min(z*1.2,6));},'Acercar'],['−',()=>{playZoomOut();setZoom(z=>Math.max(z*0.8,0.1));},'Alejar'],['⌂',()=>{ setCard(null); animateTo({x:0,y:0},0.72); },'Centrar']].map(([l,f,title])=>(
            <button key={l} title={title} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();f();}} style={{ width:34, height:34, borderRadius:9, border:`1px solid ${GOLD}28`, background:`${GOLD}08`, color:GOLD, fontSize:l==='⌂'?14:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}>{l}</button>
          ))}
          <div style={{ color:GOLD, fontSize:7.5, textAlign:'center', opacity:0.35, margin:'2px 0', letterSpacing:0.5 }}>{Math.round(zoom*100)}%</div>
          <div style={{ width:22, height:1, background:'#ffffff0a', margin:'2px 0' }}/>
          <button title="Filtrar proyectos" onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setFilterOpen(o=>!o);}} style={{ width:34, height:34, borderRadius:9, border:`1px solid ${filterOpen?GREEN+'60':GREEN+'20'}`, background:filterOpen?`${GREEN}18`:`${GREEN}06`, color:filterOpen?GREEN:`${GREEN}99`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}><FaFilter size={12}/></button>
        </div>

        {/* Info Card */}
        <AnimatePresence>
          {card && <NodeInfoCard key={card.node.id} node={card.node} onClose={closeCard} nav={nav} data={data} pan={pan} zoom={zoom} vp={vp}/>}
        </AnimatePresence>

        {/* Filter Panel */}
        <AnimatePresence>
          {filterOpen && <FilterPanel key="filter" data={data} onClose={()=>setFilterOpen(false)} nav={nav}/>}
        </AnimatePresence>

        {/* MANAGEMENT PANEL — floating draggable */}
        <ManagementPanel
          open={panelOpen} setOpen={setPanelOpen}
          tab={tab} setTab={setTab}
          form={form} setForm={setForm}
          data={data}
          allCategories={allCategories} allCompanies={allCompanies}
          addCountry={addCountry} addCategory={addCategory}
          addCompany={addCompany} addProject={addProject}
        />
      </div>
    </div>
  );
}

// ─── CORE HEX ─────────────────────────────────────────────────────────────
function CoreHex({ active, onSelect }) {
  return (
    <g style={{ cursor:'pointer' }} onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onSelect();}}>
      <polygon points={hexPoints(0,0,80)} fill={GOLD} fillOpacity={0.03} stroke="none"/>
      <polygon points={hexPoints(0,0,80)} fill="none" stroke={GOLD} strokeWidth={2} strokeOpacity={0.5} className="pc1"/>
      <polygon points={hexPoints(0,0,80)} fill="none" stroke={GOLD} strokeWidth={1.5} strokeOpacity={0.35} className="pc2"/>
      <polygon points={hexPoints(0,0,63)} fill="url(#grad-core)" stroke={active?'#fff':GOLD} strokeWidth={active?3:2} filter="url(#glow-gold)"/>
      <polygon points={hexPoints(0,0,54)} fill="none" stroke={GOLD} strokeWidth={0.6} strokeOpacity={0.4}/>
      <polygon points={hexPoints(0,0,45)} fill="none" stroke={GOLD} strokeWidth={0.3} strokeOpacity={0.2} strokeDasharray="4 5"/>
      <polygon points={hexPoints(0,0,27)} fill="#1e1600" stroke={GOLD} strokeWidth={1.6} filter="url(#glow-gold)"/>
      <text x={0} y={-1} textAnchor="middle" dominantBaseline="middle" fill={GOLD} fontSize={6.5} fontWeight={900} letterSpacing={0.8}>KYCN</text>
      <text x={0} y={10} textAnchor="middle" fill={GOLD} fontSize={4.5} fillOpacity={0.45}>COIN</text>
      <text x={0} y={79} textAnchor="middle" fill={GOLD} fontSize={10.5} fontWeight={900} letterSpacing={3}>KEYCHAIN</text>
      <text x={0} y={92} textAnchor="middle" fill={GOLD} fontSize={6} fillOpacity={0.4} letterSpacing={1.5}>ECOSYSTEM CORE</text>
    </g>
  );
}

// ─── NODE SHAPE ─────────────────────────────────────────────────────────────
function NodeShape({ node, active, onSelect }) {
  const click = useCallback((e) => { e.stopPropagation(); onSelect(node); }, [node, onSelect]);
  const stop = useCallback((e) => e.stopPropagation(), []);
  const hover = useCallback(() => { playNodeHover(); }, []);

  if (node.type === 'country') {
    const r = 27;
    return (
      <g transform={`translate(${node.x},${node.y})`} style={{ cursor:'pointer' }} onMouseDown={stop} onClick={click} onMouseEnter={hover}>
        {active && <><polygon points={hexPoints(0,0,r+7)} fill="none" stroke={AMBER} strokeWidth={2} strokeOpacity={0.6} className="pn1"/><polygon points={hexPoints(0,0,r+7)} fill="none" stroke={AMBER} strokeWidth={1.5} strokeOpacity={0.4} className="pn2"/></>}
        <polygon points={hexPoints(0,0,r+7)} fill={AMBER} fillOpacity={0.04} stroke="none"/>
        <polygon points={hexPoints(0,0,r)} fill="url(#grad-country)" stroke={active?'#fff':AMBER} strokeWidth={active?2.5:1.6} filter="url(#glow-amber)"/>
        <polygon points={hexPoints(0,0,r-6)} fill="none" stroke={AMBER} strokeWidth={0.4} strokeOpacity={0.3}/>
        <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize={19}>{node.flag}</text>
        <text x={0} y={r+14} textAnchor="middle" fill={AMBER} fontSize={8.5} fontWeight={700}>{node.name}</text>
      </g>
    );
  }
  if (node.type === 'category') {
    const s = 22;
    const Icon = ICON_MAP[node.icon];
    return (
      <g transform={`translate(${node.x},${node.y})`} style={{ cursor:'pointer' }} onMouseDown={stop} onClick={click} onMouseEnter={hover}>
        {active && <><rect x={-(s+5)} y={-(s+5)} width={(s+5)*2} height={(s+5)*2} fill="none" stroke={WHITE} strokeWidth={2} strokeOpacity={0.6} rx={4} className="pn1"/><rect x={-(s+5)} y={-(s+5)} width={(s+5)*2} height={(s+5)*2} fill="none" stroke={WHITE} strokeWidth={1.5} strokeOpacity={0.35} rx={4} className="pn2"/></>}
        <rect x={-(s+5)} y={-(s+5)} width={(s+5)*2} height={(s+5)*2} fill={WHITE} fillOpacity={0.02} rx={4}/>
        <rect x={-s} y={-s} width={s*2} height={s*2} fill="url(#grad-cat)" stroke={active?'#fff':WHITE} strokeWidth={active?2.5:1.3} filter="url(#glow-white)" rx={3}/>
        <rect x={-(s-4)} y={-(s-4)} width={(s-4)*2} height={(s-4)*2} fill="none" stroke={WHITE} strokeWidth={0.4} strokeOpacity={0.28} rx={2}/>
        {Icon && (
          <foreignObject x={-11} y={-11} width={22} height={22}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Icon size={15} color={WHITE}/>
            </div>
          </foreignObject>
        )}
        <text x={0} y={s+14} textAnchor="middle" fill={WHITE} fontSize={8} fontWeight={700}>{node.name}</text>
      </g>
    );
  }
  if (node.type === 'company') {
    const r = 15;
    const initials = node.name.split(/\s+/).map(w=>w[0]).join('').slice(0,3).toUpperCase();
    return (
      <g transform={`translate(${node.x},${node.y})`} style={{ cursor:'pointer' }} onMouseDown={stop} onClick={click} onMouseEnter={hover}>
        {active && <><circle r={r+5} fill="none" stroke={BLUE} strokeWidth={2} strokeOpacity={0.6} className="pn1"/><circle r={r+5} fill="none" stroke={BLUE} strokeWidth={1.5} strokeOpacity={0.35} className="pn2"/></>}
        <circle r={r+5} fill={BLUE} fillOpacity={0.04}/>
        <circle r={r} fill="url(#grad-comp)" stroke={active?'#fff':BLUE} strokeWidth={active?2.5:1.3} filter="url(#glow-blue)"/>
        <circle r={r-4} fill="none" stroke={BLUE} strokeWidth={0.4} strokeOpacity={0.3}/>
        <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fill={BLUE} fontSize={6} fontWeight={800}>{initials}</text>
        <text x={0} y={r+12} textAnchor="middle" fill={BLUE} fontSize={7} fillOpacity={0.8}>{node.name}</text>
      </g>
    );
  }
  if (node.type === 'project') {
    const r = 10;
    return (
      <g transform={`translate(${node.x},${node.y})`} style={{ cursor:'pointer' }} onMouseDown={stop} onClick={click} onMouseEnter={hover}>
        {active && <><circle r={r+8} fill="none" stroke={GREEN} strokeWidth={2} strokeOpacity={0.6} className="pn1"/><circle r={r+8} fill="none" stroke={GREEN} strokeWidth={1.5} strokeOpacity={0.35} className="pn2"/></>}
        <polygon points={triPoints(0,0,r+4)} fill={GREEN} fillOpacity={0.05}/>
        <polygon points={triPoints(0,0,r)} fill="url(#grad-proj)" stroke={active?'#fff':GREEN} strokeWidth={active?2:1.1} filter={active?'url(#glow-green)':undefined}/>
        <text x={0} y={r+12} textAnchor="middle" fill={GREEN} fontSize={6.5} fillOpacity={0.7}>{node.name}</text>
      </g>
    );
  }
  return null;
}

// ─── CARD COLOR ──────────────────────────────────────────────────────────────
const cardColor = (type) => type==='core'?GOLD:type==='country'?AMBER:type==='category'?WHITE:type==='company'?BLUE:GREEN;

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────
function CTabs({ tabs, labels, active, color, onChange }) {
  return (
    <div style={{ display:'flex', background:'#07070b', borderBottom:`1px solid ${color}12` }}>
      {tabs.map((t,i) => (
        <button key={t} onClick={()=>onChange(t)} style={{ flex:1, padding:'8px 4px', fontSize:8.5, fontWeight:700, letterSpacing:0.8, textTransform:'uppercase', border:'none', borderBottom:active===t?`2px solid ${color}`:'2px solid transparent', background:'none', color:active===t?color:'#3a3a4a', cursor:'pointer', transition:'color 0.15s' }}>{labels[i]}</button>
      ))}
    </div>
  );
}
function CBody({ children, maxH=380 }) { return <div style={{ padding:'14px 18px', maxHeight:maxH, overflowY:'auto' }}>{children}</div>; }
function CFoot({ children }) { return <div style={{ padding:'10px 18px', borderTop:'1px solid #ffffff08', display:'flex', gap:7, flexWrap:'wrap' }}>{children}</div>; }
function CBtn({ color, children, onClick }) {
  return <button onClick={onClick} style={{ flex:1, padding:'8px 10px', borderRadius:9, border:`1px solid ${color}40`, background:`${color}10`, color, fontSize:9.5, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'background 0.15s' }}>{children}</button>;
}
function CRow({ label, value, vc='#aaa' }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #ffffff05' }}>
      <span style={{ color:'#444', fontSize:9.5 }}>{label}</span>
      <span style={{ color:vc, fontSize:10, fontWeight:600 }}>{value}</span>
    </div>
  );
}
function CSection({ label, color='#444' }) {
  return <div style={{ color, fontSize:8.5, letterSpacing:1.2, textTransform:'uppercase', marginTop:14, marginBottom:7, display:'flex', alignItems:'center', gap:6 }}><span style={{ flex:1, height:1, background:`${color}30` }}/>{label}<span style={{ flex:1, height:1, background:`${color}30` }}/></div>;
}
function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ color:'#555', fontSize:9 }}>{label}</span>
        <span style={{ color, fontSize:9, fontWeight:700 }}>{value}/100</span>
      </div>
      <div style={{ height:4, background:'#ffffff08', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${value}%`, height:'100%', background:`linear-gradient(90deg,${color}80,${color})`, borderRadius:2 }}/>
      </div>
    </div>
  );
}
function StarRating({ value, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3 }}>
      {[1,2,3,4,5].map(i => (
        <FaStar key={i} size={10} color={i<=Math.round(value)?color:'#2a2a3a'}/>
      ))}
      <span style={{ color:'#666', fontSize:9, marginLeft:3 }}>{value.toFixed(1)}</span>
    </div>
  );
}
function PhotoCarousel({ photos, color }) {
  const [idx, setIdx] = useState(0);
  const ph = photos[idx];
  return (
    <div>
      <div style={{ height:130, background:`linear-gradient(135deg,${ph.bg},#06060a)`, borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', border:`1px solid ${color}12` }}>
        <span style={{ fontSize:48, filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.8))' }}>{ph.emoji}</span>
        <div style={{ color:'#666', fontSize:8.5, marginTop:6, letterSpacing:0.5 }}>{ph.label}</div>
        {photos.length > 1 && (
          <>
            <button onClick={e=>{e.stopPropagation();setIdx(i=>(i-1+photos.length)%photos.length);}} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', width:22, height:22, borderRadius:6, border:`1px solid ${color}30`, background:'#00000060', color, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><FaChevronLeft size={8}/></button>
            <button onClick={e=>{e.stopPropagation();setIdx(i=>(i+1)%photos.length);}} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', width:22, height:22, borderRadius:6, border:`1px solid ${color}30`, background:'#00000060', color, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><FaChevronRight size={8}/></button>
          </>
        )}
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:5, marginTop:7 }}>
        {photos.map((_,i) => <span key={i} onClick={()=>setIdx(i)} style={{ width:i===idx?16:5, height:5, borderRadius:3, background:i===idx?color:'#2a2a3a', cursor:'pointer', transition:'width 0.2s,background 0.2s' }}/>)}
      </div>
    </div>
  );
}
function DocList({ docs, color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {docs.map((d,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'#ffffff04', borderRadius:8, border:`1px solid ${color}10` }}>
          <FaFileAlt size={12} color={color} style={{ flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ color:'#ccc', fontSize:9.5, fontWeight:600 }}>{d.title}</div>
            {d.date && <div style={{ color:'#444', fontSize:8 }}>{d.date}</div>}
          </div>
          <span style={{ color:'#444', fontSize:8, border:'1px solid #2a2a3a', borderRadius:4, padding:'2px 5px' }}>{d.type}</span>
        </div>
      ))}
    </div>
  );
}

// ─── NODE INFO CARD ──────────────────────────────────────────────────────────
function NodeInfoCard({ node, onClose, nav, data, pan, zoom, vp }) {
  const CARD_W = 360;
  const svgX = vp.w / 2 + pan.x + node.x * zoom;
  const svgY = vp.h / 2 + pan.y + node.y * zoom;
  const nodeR = node.type==='country'?27*zoom:node.type==='category'?22*zoom:node.type==='company'?15*zoom:10*zoom;
  const rawLeft = svgX - nodeR - CARD_W - 28;
  const left = Math.max(8, Math.min(vp.w - CARD_W - 52, rawLeft));
  const top = Math.max(74, Math.min(vp.h - 80, svgY - 220));
  const color = cardColor(node.type);

  return (
    <motion.div
      initial={{ opacity:0, scale:0.9, x:-12 }} animate={{ opacity:1, scale:1, x:0 }} exit={{ opacity:0, scale:0.9, x:-12 }}
      transition={{ duration:0.18, ease:'easeOut' }}
      onMouseDown={e=>e.stopPropagation()}
      style={{ position:'absolute', left, top, width:CARD_W, zIndex:30, background:'linear-gradient(160deg,#0e0c0a,#08080f)', border:`1px solid ${color}22`, borderRadius:20, overflow:'hidden', boxShadow:`0 0 0 1px ${color}08, 0 0 50px ${color}10, 0 24px 64px rgba(0,0,0,0.85)` }}
    >
      <button onClick={onClose} style={{ position:'absolute', top:11, right:11, width:26, height:26, borderRadius:7, border:`1px solid ${color}25`, background:`${color}10`, color, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
        <FaTimes size={9}/>
      </button>

      {node.type==='core'     && <CoreCard/>}
      {node.type==='country'  && <CountryCard node={node} data={data} nav={nav}/>}
      {node.type==='category' && <CategoryCard node={node} nav={nav}/>}
      {node.type==='company'  && <CompanyCard node={node} nav={nav}/>}
      {node.type==='project'  && <ProjectCard node={node} nav={nav}/>}
    </motion.div>
  );
}

// ─── CORE CARD ────────────────────────────────────────────────────────────
function CoreCard() {
  const tc = INITIAL_DATA.countries.length;
  const tcat = INITIAL_DATA.countries.reduce((a,c)=>a+c.categories.length,0);
  const tcomp = INITIAL_DATA.countries.reduce((a,c)=>a+c.categories.reduce((b,cat)=>b+cat.companies.length,0),0);
  const tproj = INITIAL_DATA.countries.reduce((a,c)=>a+c.categories.reduce((b,cat)=>b+cat.companies.reduce((d,co)=>d+co.projects.length,0),0),0);
  return (
    <>
      <div style={{ padding:'22px 18px 14px', borderBottom:`1px solid ${GOLD}12` }}>
        <div style={{ fontSize:8.5, color:GOLD, letterSpacing:2, textTransform:'uppercase', opacity:0.4, marginBottom:4 }}>Núcleo del Ecosistema</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:28 }}>🔗</span>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'#eee', letterSpacing:-0.5 }}>KEYCHAIN</div>
            <div style={{ fontSize:9, color:GOLD, opacity:0.6 }}>Token KYCN · Polygon Layer 2</div>
          </div>
        </div>
      </div>
      <CBody>
        <div style={{ color:'#666', fontSize:9.5, lineHeight:1.75, marginBottom:14 }}>Plataforma de tokenización RWA para Latinoamérica. Conecta inversores con activos reales verificados a través de blockchain.</div>
        <CRow label="Token" value="KYCN · ERC-20" vc={GOLD}/>
        <CRow label="Red" value="Polygon · Layer 2" vc={GOLD}/>
        <CRow label="Protocolo" value="ERC-4626 + EIP-3525" vc={GOLD}/>
        <CRow label="Custodia" value="Multi-sig 3/5" vc={GOLD}/>
        <div style={{ display:'flex', gap:8, marginTop:16 }}>
          {[['Países',tc,AMBER],['Categorías',tcat,WHITE],['Empresas',tcomp,BLUE],['Proyectos',tproj,GREEN]].map(([l,v,c]) => (
            <div key={l} style={{ flex:1, textAlign:'center', background:'#ffffff04', borderRadius:10, padding:'10px 4px', border:`1px solid ${c}12` }}>
              <div style={{ color:c, fontSize:18, fontWeight:800 }}>{v}</div>
              <div style={{ color:'#444', fontSize:7.5, marginTop:1 }}>{l}</div>
            </div>
          ))}
        </div>
      </CBody>
      <CFoot><CBtn color={GOLD} onClick={()=>{}}><FaExternalLinkAlt size={8}/> Ver token KYCN</CBtn><CBtn color={GOLD} onClick={()=>{}}><FaCoins size={8}/> Tokenómica</CBtn></CFoot>
    </>
  );
}

// ─── COUNTRY CARD ────────────────────────────────────────────────────────────
function CountryCard({ node, nav }) {
  const [tab, setTab] = useState('resumen');
  const country = node.data;
  const meta = COUNTRY_META[node.id] || {};
  const tcomp = country.categories.reduce((a,c)=>a+c.companies.length,0);
  const tproj = country.categories.reduce((a,c)=>a+c.companies.reduce((b,co)=>b+co.projects.length,0),0);
  return (
    <>
      <div style={{ padding:'20px 18px 14px', borderBottom:`1px solid ${AMBER}12` }}>
        <div style={{ fontSize:8.5, color:AMBER, letterSpacing:2, textTransform:'uppercase', opacity:0.4, marginBottom:4 }}>País · Jurisdicción</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:30 }}>{country.flag}</span>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:'#eee' }}>{country.name}</div>
            <div style={{ fontSize:9, color:AMBER, opacity:0.7 }}>{meta.rating||'N/D'} · {meta.status||'Activo'}</div>
          </div>
        </div>
      </div>
      <CTabs tabs={['resumen','regulacion','documentos']} labels={['Resumen','Marco Legal','Documentos']} active={tab} color={AMBER} onChange={setTab}/>
      {tab==='resumen' && (
        <CBody>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {[['Categorías',country.categories.length,AMBER],['Empresas',tcomp,BLUE],['Proyectos',tproj,GREEN]].map(([l,v,c]) => (
              <div key={l} style={{ flex:1, textAlign:'center', background:'#ffffff04', borderRadius:9, padding:'9px 4px', border:`1px solid ${c}12` }}>
                <div style={{ color:c, fontSize:17, fontWeight:800 }}>{v}</div><div style={{ color:'#444', fontSize:7.5 }}>{l}</div>
              </div>
            ))}
          </div>
          <CRow label="Marco legal" value={meta.legal||'N/D'} vc={AMBER}/>
          <CRow label="Impuesto capital" value={meta.tax||'N/D'}/>
          <CRow label="PIB" value={meta.gdp||'N/D'}/>
          <CRow label="Población" value={meta.pop||'N/D'}/>
          <CSection label="Categorías activas" color={AMBER}/>
          {country.categories.map(cat => {
            const Icon = ICON_MAP[cat.icon] || FaBuilding;
            return (
              <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 10px', background:'#ffffff04', borderRadius:8, marginBottom:4 }}>
                <Icon size={10} color={AMBER}/><span style={{ color:'#bbb', fontSize:10 }}>{cat.name}</span>
                <span style={{ marginLeft:'auto', color:'#444', fontSize:8.5 }}>{cat.companies.length} emp.</span>
              </div>
            );
          })}
        </CBody>
      )}
      {tab==='regulacion' && (
        <CBody>
          <CSection label="Puntuaciones" color={AMBER}/>
          <ScoreBar label="Nivel de Regulación" value={meta.regulation_score||0} color={AMBER}/>
          <ScoreBar label="Descentralización" value={meta.decentralization_score||0} color={BLUE}/>
          <ScoreBar label="Seguridad Jurídica" value={meta.security_score||0} color={GREEN}/>
          <div style={{ marginTop:14, padding:'11px 13px', background:`${AMBER}08`, borderRadius:10, border:`1px solid ${AMBER}12`, color:'#777', fontSize:9.5, lineHeight:1.8 }}>
            {meta.regulation_detail||'Información regulatoria no disponible.'}
          </div>
        </CBody>
      )}
      {tab==='documentos' && (
        <CBody>
          <div style={{ color:'#555', fontSize:9, marginBottom:12 }}>Documentos regulatorios oficiales disponibles para este país.</div>
          <DocList docs={meta.docs||[]} color={AMBER}/>
        </CBody>
      )}
      <CFoot><CBtn color={AMBER} onClick={()=>nav('primario')}><FaArrowRight size={8}/> Proyectos en {country.name}</CBtn></CFoot>
    </>
  );
}

// ─── CATEGORY CARD ───────────────────────────────────────────────────────────
function CategoryCard({ node, nav }) {
  const cat = node.data;
  const meta = CATEGORY_META[cat.id] || CATEGORY_META[node.id?.split('_')[0]] || {};
  const tproj = cat.companies.reduce((a,c)=>a+c.projects.length,0);
  const Icon = ICON_MAP[cat.icon] || FaBuilding;
  const riskColor = meta.risk==='Bajo'?GREEN:meta.risk==='Alto'?'#ef4444':AMBER;
  return (
    <>
      <div style={{ padding:'20px 18px 14px', borderBottom:`1px solid ${WHITE}12` }}>
        <div style={{ fontSize:8.5, color:WHITE, letterSpacing:2, textTransform:'uppercase', opacity:0.35, marginBottom:4 }}>Categoría · {node.countryFlag} {node.countryName}</div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38,height:38,borderRadius:10,background:'#12121e',border:`1px solid ${WHITE}18`,display:'flex',alignItems:'center',justifyContent:'center' }}><Icon size={18} color={WHITE}/></div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'#eee' }}>{cat.name}</div>
            <div style={{ fontSize:9, color:riskColor, opacity:0.8 }}>Riesgo {meta.risk||'Medio'}</div>
          </div>
        </div>
      </div>
      <CBody>
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {[['Empresas',cat.companies.length,BLUE],['Proyectos',tproj,GREEN]].map(([l,v,c]) => (
            <div key={l} style={{ flex:1, textAlign:'center', background:'#ffffff04', borderRadius:9, padding:'9px 4px', border:`1px solid ${c}12` }}>
              <div style={{ color:c, fontSize:17, fontWeight:800 }}>{v}</div><div style={{ color:'#444', fontSize:7.5 }}>{l}</div>
            </div>
          ))}
          <div style={{ flex:1, textAlign:'center', background:'#ffffff04', borderRadius:9, padding:'9px 4px', border:`1px solid ${GREEN}12` }}>
            <div style={{ color:GREEN, fontSize:11, fontWeight:800 }}>{meta.growth||'N/D'}</div><div style={{ color:'#444', fontSize:7.5 }}>Proyección</div>
          </div>
        </div>
        <CRow label="Regulatorio" value={meta.legal||'N/D'} vc={WHITE}/>
        <div style={{ marginTop:12, padding:'10px 12px', background:'#ffffff04', borderRadius:9, color:'#666', fontSize:9.5, lineHeight:1.75 }}>
          <span style={{ color:WHITE, fontWeight:600 }}>Beneficios: </span>{meta.benefits||'Activos tokenizados'}
        </div>
        <CSection label="Empresas" color={WHITE}/>
        {cat.companies.map(comp => (
          <div key={comp.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 10px', background:'#ffffff04', borderRadius:8, marginBottom:4 }}>
            <span style={{ width:7,height:7,borderRadius:'50%',background:BLUE,display:'inline-block',flexShrink:0 }}/>
            <span style={{ color:'#bbb', fontSize:10 }}>{comp.name}</span>
            <span style={{ marginLeft:'auto', color:'#444', fontSize:8.5 }}>{comp.projects.length} proy.</span>
          </div>
        ))}
      </CBody>
      <CFoot><CBtn color={WHITE} onClick={()=>nav('primario')}><FaArrowRight size={8}/> Marketplace {cat.name}</CBtn></CFoot>
    </>
  );
}

// ─── COMPANY CARD ────────────────────────────────────────────────────────────
function CompanyCard({ node, nav }) {
  const [tab, setTab] = useState('perfil');
  const comp = node.data;
  const meta = COMPANY_META[node.id] || {};
  const initials = comp.name.slice(0,2).toUpperCase();
  return (
    <>
      {/* Banner */}
      <div style={{ height:72, background:meta.bannerBg||`linear-gradient(135deg,${BLUE}18,#0a0a14)`, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        <span style={{ fontSize:36, opacity:0.18, position:'absolute', right:16, top:'50%', transform:'translateY(-50%)' }}>{meta.bannerEmoji||'🏢'}</span>
        <div style={{ width:52,height:52,borderRadius:14,background:'#0c0c18',border:`2px solid ${BLUE}50`,display:'flex',alignItems:'center',justifyContent:'center',position:'absolute',bottom:-22,left:18,fontSize:15,fontWeight:800,color:BLUE,boxShadow:`0 4px 16px rgba(0,0,0,0.6)` }}>
          {initials}
        </div>
      </div>
      <div style={{ padding:'28px 18px 12px', borderBottom:`1px solid ${BLUE}12` }}>
        <div style={{ fontSize:8.5, color:BLUE, letterSpacing:2, textTransform:'uppercase', opacity:0.4, marginBottom:2 }}>{node.countryFlag} {node.catName}</div>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div style={{ fontSize:16, fontWeight:800, color:'#eee' }}>{comp.name}</div>
          {meta.rating && <StarRating value={meta.rating} color={GOLD}/>}
        </div>
        {meta.social && (
          <div style={{ display:'flex', gap:8, marginTop:7 }}>
            {meta.social.twitter && <a style={{ color:'#1da1f2', fontSize:9, display:'flex', alignItems:'center', gap:3, textDecoration:'none' }}><FaTwitter size={10}/> {meta.social.twitter}</a>}
            {meta.social.web && <a style={{ color:BLUE, fontSize:9, display:'flex', alignItems:'center', gap:3, textDecoration:'none' }}><FaGlobe size={10}/> {meta.social.web}</a>}
          </div>
        )}
      </div>
      <CTabs tabs={['perfil','proyectos','hitos','opiniones']} labels={['Perfil','Proyectos','Hitos','Opiniones']} active={tab} color={BLUE} onChange={setTab}/>
      {tab==='perfil' && (
        <CBody>
          {meta.bio && <div style={{ color:'#666', fontSize:9.5, lineHeight:1.8, marginBottom:14 }}>{meta.bio}</div>}
          <CRow label="Token" value={meta.tokens||'N/D'} vc={BLUE}/>
          <CRow label="APY promedio" value={meta.apy?`${meta.apy}%`:'N/D'} vc={GREEN}/>
          <CRow label="Fundada" value={meta.since||'N/D'}/>
          <CRow label="Proyectos activos" value={comp.projects.length} vc={GREEN}/>
          {meta.rating && (
            <div style={{ marginTop:12, padding:'10px 12px', background:`${GOLD}08`, borderRadius:9, border:`1px solid ${GOLD}12` }}>
              <div style={{ fontSize:8.5, color:GOLD, marginBottom:5 }}>Calificación general</div>
              <StarRating value={meta.rating} color={GOLD}/>
              <div style={{ color:'#444', fontSize:8.5, marginTop:4 }}>{meta.reviews?.length||0} opiniones verificadas</div>
            </div>
          )}
        </CBody>
      )}
      {tab==='proyectos' && (
        <CBody>
          {comp.projects.map(proj => {
            const pm = PROJECT_META[proj.id] || {};
            const sc = pm.status==='Activo'?GREEN:pm.status==='Lanzando'?AMBER:'#888';
            return (
              <div key={proj.id} style={{ padding:'10px 12px', background:'#ffffff04', borderRadius:10, marginBottom:8, border:`1px solid ${GREEN}12` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:'#ddd', fontSize:10.5, fontWeight:700 }}>▲ {proj.name}</span>
                  <span style={{ color:GREEN, fontSize:10.5, fontWeight:800 }}>{pm.apy?`${pm.apy}%`:''}</span>
                </div>
                <div style={{ fontSize:8.5, color:'#555', marginBottom:6 }}>{pm.type||'RWA'} · Mín ${pm.min||'—'} · {pm.dur||'—'}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:sc, fontSize:8.5, fontWeight:600 }}>{pm.status||'—'}</span>
                  <span style={{ color:'#555', fontSize:8 }}>{pm.filled||0}% fondeado</span>
                </div>
                {pm.filled !== undefined && <div style={{ marginTop:5, height:3, background:'#ffffff08', borderRadius:2, overflow:'hidden' }}><div style={{ width:`${pm.filled}%`, height:'100%', background:`linear-gradient(90deg,${GREEN}80,${GREEN})`, borderRadius:2 }}/></div>}
              </div>
            );
          })}
        </CBody>
      )}
      {tab==='hitos' && (
        <CBody>
          <div style={{ position:'relative', paddingLeft:16 }}>
            <div style={{ position:'absolute', left:5, top:8, bottom:8, width:1, background:`${BLUE}20` }}/>
            {(meta.milestones||[]).map((m,i) => (
              <div key={i} style={{ position:'relative', marginBottom:14 }}>
                <div style={{ position:'absolute', left:-13, top:3, width:7, height:7, borderRadius:'50%', background:BLUE, boxShadow:`0 0 8px ${BLUE}80` }}/>
                <div style={{ fontSize:8.5, color:BLUE, fontWeight:700, marginBottom:2 }}>{m.year}</div>
                <div style={{ color:'#999', fontSize:9.5 }}>{m.label}</div>
              </div>
            ))}
            {!(meta.milestones?.length) && <div style={{ color:'#444', fontSize:9.5 }}>Sin hitos disponibles.</div>}
          </div>
        </CBody>
      )}
      {tab==='opiniones' && (
        <CBody>
          {(meta.reviews||[]).map((r,i) => (
            <div key={i} style={{ padding:'10px 12px', background:'#ffffff04', borderRadius:10, marginBottom:8, border:`1px solid #ffffff08` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ color:'#bbb', fontSize:9.5, fontWeight:600 }}>{r.user}</span>
                <StarRating value={r.stars} color={GOLD}/>
              </div>
              <div style={{ color:'#666', fontSize:9.5, lineHeight:1.7 }}>"{r.text}"</div>
            </div>
          ))}
          {!(meta.reviews?.length) && <div style={{ color:'#444', fontSize:9.5 }}>Sin opiniones disponibles.</div>}
        </CBody>
      )}
      <CFoot>
        <CBtn color={BLUE} onClick={()=>nav('primario')}><FaExternalLinkAlt size={8}/> Perfil completo</CBtn>
        <CBtn color={GREEN} onClick={()=>nav('primario')}><FaArrowRight size={8}/> Invertir</CBtn>
      </CFoot>
    </>
  );
}

// ─── PROJECT CARD ────────────────────────────────────────────────────────────
function ProjectCard({ node, nav }) {
  const [tab, setTab] = useState('resumen');
  const proj = node.data;
  const meta = PROJECT_META[node.id] || {};
  const sc = meta.status==='Activo'?GREEN:meta.status==='Lanzando'?AMBER:'#888';
  return (
    <>
      <div style={{ padding:'20px 18px 14px', borderBottom:`1px solid ${GREEN}12` }}>
        <div style={{ fontSize:8.5, color:GREEN, letterSpacing:2, textTransform:'uppercase', opacity:0.4, marginBottom:4 }}>Proyecto · {node.countryFlag} {node.compName}</div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ color:GREEN, fontSize:14 }}>▲</span>
          <div style={{ fontSize:16, fontWeight:800, color:'#eee' }}>{proj.name}</div>
          <span style={{ marginLeft:'auto', padding:'3px 8px', borderRadius:5, background:`${sc}14`, color:sc, fontSize:8, fontWeight:700, border:`1px solid ${sc}30` }}>{meta.status||'Activo'}</span>
        </div>
        {meta.filled !== undefined && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ color:'#444', fontSize:8.5 }}>Fondeado</span>
              <span style={{ color:GREEN, fontSize:8.5, fontWeight:700 }}>{meta.filled}%</span>
            </div>
            <div style={{ height:5, background:'#ffffff08', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${meta.filled}%`, height:'100%', background:`linear-gradient(90deg,${GREEN}80,${GREEN})`, borderRadius:3 }}/>
            </div>
          </div>
        )}
      </div>
      <CTabs tabs={['resumen','galeria','tokenomica','documentos']} labels={['Resumen','Galería','Tokenómica','Docs']} active={tab} color={GREEN} onChange={setTab}/>
      {tab==='resumen' && (
        <CBody>
          {meta.description && <div style={{ color:'#666', fontSize:9.5, lineHeight:1.8, marginBottom:12 }}>{meta.description}</div>}
          <CRow label="Tipo de activo" value={meta.type||'RWA'} vc={GREEN}/>
          <CRow label="APY" value={meta.apy?`${meta.apy}%`:'N/D'} vc={GREEN}/>
          <CRow label="Inversión mínima" value={meta.min?`$${meta.min} USDC`:'N/D'}/>
          <CRow label="Duración" value={meta.dur||'N/D'}/>
          <CRow label="Categoría" value={node.catName||'N/D'} vc={WHITE}/>
          <CSection label="Scores" color={GREEN}/>
          <ScoreBar label="Confianza" value={meta.trust_score||0} color={GOLD}/>
          <ScoreBar label="Seguridad" value={meta.security_score||0} color={BLUE}/>
          <ScoreBar label="Descentralización" value={meta.decentralization_score||0} color={GREEN}/>
          {meta.apy && (
            <div style={{ marginTop:12, padding:'10px 12px', background:`${GREEN}08`, borderRadius:9, border:`1px solid ${GREEN}12` }}>
              <div style={{ color:GREEN, fontSize:9, fontWeight:600, marginBottom:2 }}>Retorno estimado a {meta.dur||'12m'}</div>
              <div style={{ color:'#777', fontSize:9 }}>Sobre $1,000 → <span style={{ color:GREEN, fontWeight:800 }}>${Math.round(1000*meta.apy/100)} USDC</span></div>
            </div>
          )}
        </CBody>
      )}
      {tab==='galeria' && (
        <CBody>
          {meta.photos?.length ? <PhotoCarousel photos={meta.photos} color={GREEN}/> : <div style={{ color:'#444', fontSize:9.5 }}>Sin imágenes disponibles.</div>}
        </CBody>
      )}
      {tab==='tokenomica' && (
        <CBody>
          {meta.tokenomics ? (
            <>
              <CRow label="Supply total" value={meta.tokenomics.supply} vc={GREEN}/>
              <CRow label="Precio token" value={meta.tokenomics.price} vc={GREEN}/>
              <CRow label="Holders" value={meta.tokenomics.holders} vc={BLUE}/>
              <CRow label="Liquidez" value={meta.tokenomics.liquidity} vc={AMBER}/>
              <CSection label="Distribución" color={GREEN}/>
              {meta.tokenomics.distribution.map(([label,pct]) => (
                <div key={label} style={{ marginBottom:7 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ color:'#888', fontSize:9 }}>{label}</span>
                    <span style={{ color:GREEN, fontSize:9, fontWeight:700 }}>{pct}</span>
                  </div>
                  <div style={{ height:3, background:'#ffffff08', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:pct, height:'100%', background:`linear-gradient(90deg,${GREEN}60,${GREEN})`, borderRadius:2 }}/>
                  </div>
                </div>
              ))}
            </>
          ) : <div style={{ color:'#444', fontSize:9.5 }}>Tokenómica no disponible.</div>}
        </CBody>
      )}
      {tab==='documentos' && (
        <CBody>
          <DocList docs={meta.docs||[]} color={GREEN}/>
        </CBody>
      )}
      <CFoot>
        <CBtn color={WHITE} onClick={()=>nav('detalle',{id:node.id})}><FaExternalLinkAlt size={8}/> Detalle</CBtn>
        <CBtn color={GREEN} onClick={()=>nav('checkout',{id:node.id})}><FaArrowRight size={8}/> Invertir</CBtn>
      </CFoot>
    </>
  );
}

// ─── FILTER PANEL ────────────────────────────────────────────────────────────
function FilterPanel({ data, onClose, nav }) {
  const [sort, setSort] = useState('trust');
  const [statusF, setStatusF] = useState('all');

  const allProjects = [];
  data.countries.forEach(country => {
    const cm = COUNTRY_META[country.id] || {};
    country.categories.forEach(cat => {
      cat.companies.forEach(comp => {
        comp.projects.forEach(proj => {
          const pm = PROJECT_META[proj.id] || {};
          allProjects.push({ ...proj, pm, country, cat, comp, cm });
        });
      });
    });
  });

  const ratingMap = { BBB:3, 'BB+':2, 'BB-':1 };
  let sorted = [...allProjects];
  if (statusF !== 'all') sorted = sorted.filter(p=>p.pm.status===statusF);
  if (sort==='trust')       sorted.sort((a,b)=>(b.pm.trust_score||0)-(a.pm.trust_score||0));
  else if (sort==='apy_h')  sorted.sort((a,b)=>(b.pm.apy||0)-(a.pm.apy||0));
  else if (sort==='apy_l')  sorted.sort((a,b)=>(a.pm.apy||0)-(b.pm.apy||0));
  else if (sort==='min_l')  sorted.sort((a,b)=>(a.pm.min||0)-(b.pm.min||0));
  else if (sort==='reg')    sorted.sort((a,b)=>(ratingMap[b.cm.rating]||0)-(ratingMap[a.cm.rating]||0));
  else if (sort==='sec')    sorted.sort((a,b)=>(b.pm.security_score||0)-(a.pm.security_score||0));
  else if (sort==='defi')   sorted.sort((a,b)=>(b.pm.decentralization_score||0)-(a.pm.decentralization_score||0));

  const SORTS = [
    { k:'trust',  label:'+ Confianza',      icon:<FaShieldAlt size={9}/> },
    { k:'apy_h',  label:'Mayor APY',         icon:<FaSortAmountDown size={9}/> },
    { k:'apy_l',  label:'Menor APY',         icon:<FaSortAmountUp size={9}/> },
    { k:'min_l',  label:'+ Económico',       icon:<FaCoins size={9}/> },
    { k:'reg',    label:'+ Regulado',        icon:<FaLock size={9}/> },
    { k:'sec',    label:'+ Seguro',          icon:<FaCheckCircle size={9}/> },
    { k:'defi',   label:'+ Descentralizado', icon:<FaBolt size={9}/> },
  ];

  return (
    <motion.div
      initial={{ opacity:0, x:20, scale:0.95 }} animate={{ opacity:1, x:0, scale:1 }} exit={{ opacity:0, x:20, scale:0.95 }}
      transition={{ duration:0.18, ease:'easeOut' }}
      onMouseDown={e=>e.stopPropagation()}
      style={{ position:'absolute', bottom:80, right:56, width:300, zIndex:35, background:'linear-gradient(160deg,#0c0a0e,#080810)', border:`1px solid ${GREEN}22`, borderRadius:18, overflow:'hidden', boxShadow:`0 0 40px ${GREEN}10, 0 20px 60px rgba(0,0,0,0.85)` }}
    >
      <div style={{ padding:'14px 16px 10px', borderBottom:`1px solid ${GREEN}10`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <FaFilter size={11} color={GREEN}/>
          <span style={{ color:'#ccc', fontSize:11, fontWeight:700 }}>Filtrar Proyectos</span>
        </div>
        <button onClick={onClose} style={{ width:22, height:22, borderRadius:6, border:`1px solid ${GREEN}25`, background:`${GREEN}10`, color:GREEN, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><FaTimes size={8}/></button>
      </div>

      {/* Sort chips */}
      <div style={{ padding:'10px 14px 8px' }}>
        <div style={{ fontSize:8, color:'#444', letterSpacing:1, textTransform:'uppercase', marginBottom:7 }}>Ordenar por</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {SORTS.map(s => (
            <button key={s.k} onClick={()=>setSort(s.k)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', borderRadius:7, fontSize:8.5, fontWeight:600, cursor:'pointer', border:`1px solid ${sort===s.k?GREEN+'60':'#1e1e2e'}`, background:sort===s.k?`${GREEN}18`:'#0c0c18', color:sort===s.k?GREEN:'#555', transition:'all 0.15s' }}>{s.icon}{s.label}</button>
          ))}
        </div>
      </div>

      {/* Status filter */}
      <div style={{ padding:'0 14px 10px' }}>
        <div style={{ fontSize:8, color:'#444', letterSpacing:1, textTransform:'uppercase', marginBottom:7 }}>Estado</div>
        <div style={{ display:'flex', gap:5 }}>
          {[['all','Todos'],['Activo','Activos'],['Lanzando','Lanzando']].map(([k,l]) => (
            <button key={k} onClick={()=>setStatusF(k)} style={{ flex:1, padding:'5px 4px', borderRadius:7, fontSize:8.5, fontWeight:600, cursor:'pointer', border:`1px solid ${statusF===k?GREEN+'50':'#1e1e2e'}`, background:statusF===k?`${GREEN}14`:'#0c0c18', color:statusF===k?GREEN:'#555', transition:'all 0.15s' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ borderTop:`1px solid ${GREEN}10`, maxHeight:280, overflowY:'auto' }}>
        <div style={{ padding:'8px 14px 4px', fontSize:8, color:'#444', letterSpacing:1, textTransform:'uppercase', display:'flex', justifyContent:'space-between' }}>
          <span>Proyectos</span><span style={{ color:GREEN }}>{sorted.length} resultados</span>
        </div>
        {sorted.map((p,i) => {
          const sc = p.pm.status==='Activo'?GREEN:p.pm.status==='Lanzando'?AMBER:'#888';
          return (
            <div key={p.id} style={{ padding:'9px 14px', borderTop:'1px solid #ffffff04', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={()=>nav('detalle',{id:p.id})}>
              <div style={{ width:24, height:24, borderRadius:6, background:`${GREEN}12`, border:`1px solid ${GREEN}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:GREEN, fontWeight:800, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:'#ccc', fontSize:9.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                <div style={{ color:'#444', fontSize:8 }}>{p.country.flag} {p.country.name} · {p.comp.name}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ color:GREEN, fontSize:10, fontWeight:800 }}>{p.pm.apy}%</div>
                <div style={{ color:sc, fontSize:7.5 }}>{p.pm.status}</div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── MANAGEMENT PANEL ─────────────────────────────────────────────────────────
function ManagementPanel({ open, setOpen, tab, setTab, form, setForm, data, allCategories, allCompanies, addCountry, addCategory, addCompany, addProject }) {
  const [pos, setPos] = useState({ x: null, y: 70 });
  const panelRef = useRef(null);
  const dragging = useRef(false);
  const dragOff = useRef({ x:0, y:0 });

  const onDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    const rect = panelRef.current.getBoundingClientRect();
    dragOff.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const onMove = (ev) => {
      if (!dragging.current) return;
      setPos({ x: ev.clientX - dragOff.current.x, y: Math.max(0, ev.clientY - dragOff.current.y) });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const posStyle = pos.x !== null ? { left: pos.x, top: pos.y } : { right: 20, top: pos.y };

  return (
    <div
      ref={panelRef}
      onMouseDown={e => e.stopPropagation()}
      style={{ position:'absolute', ...posStyle, width:open?300:44, background:'#0a0a0e', border:`1px solid ${GOLD}28`, borderRadius:14, display:'flex', flexDirection:'column', overflow:'hidden', zIndex:40, fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif", transition:'width 0.2s', boxShadow:`0 12px 48px rgba(0,0,0,0.75), 0 0 0 1px ${GOLD}0a`, maxHeight:'calc(100vh - 90px)' }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        style={{ display:'flex', alignItems:'center', gap:8, padding: open ? '10px 12px 10px 10px' : '10px 8px', borderBottom: open ? `1px solid ${GOLD}15` : 'none', cursor:'grab', background:`${GOLD}07`, flexShrink:0, minHeight:44 }}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:2.5, flexShrink:0 }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ display:'flex', gap:2 }}>
              {[0,1].map(j=><div key={j} style={{ width:2.5, height:2.5, borderRadius:'50%', background:GOLD, opacity:0.35 }}/>)}
            </div>
          ))}
        </div>
        {open && <span style={{ flex:1, color:GOLD, fontSize:9, fontWeight:700, letterSpacing:2, textTransform:'uppercase', opacity:0.6, whiteSpace:'nowrap', overflow:'hidden' }}>Gestionar Ecosistema</span>}
        <button
          onMouseDown={e=>e.stopPropagation()}
          onClick={()=>setOpen(o=>!o)}
          style={{ width:24, height:24, borderRadius:6, border:`1px solid ${GOLD}40`, background:'#111118', color:GOLD, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
        >{open ? '×' : '⋮'}</button>
      </div>

      {open && (
        <div style={{ padding:'12px 16px', overflowY:'auto', flex:1 }}>
          <div style={{ display:'flex', gap:4, marginBottom:18, flexWrap:'wrap' }}>
            {[['country','País'],['category','Categoría'],['company','Empresa'],['project','Proyecto']].map(([t,l]) => (
              <button key={t} onClick={()=>setTab(t)} style={{ padding:'4px 10px', borderRadius:6, fontSize:9, fontWeight:600, cursor:'pointer', border:'none', background:tab===t?GOLD:'#1a1a22', color:tab===t?'#000':'#888' }}>{l}</button>
            ))}
          </div>

          {tab==='country' && <>
            <PLabel color={AMBER}>Añadir País</PLabel>
            <SLab>Nombre</SLab><PIn value={form.country.name} onChange={v=>setForm(f=>({...f,country:{...f.country,name:v}}))} ph="Ej: México"/>
            <SLab>Bandera (emoji)</SLab><PIn value={form.country.flag} onChange={v=>setForm(f=>({...f,country:{...f.country,flag:v}}))} ph="🇲🇽"/>
            <PBt color={AMBER} onClick={addCountry}>+ Añadir País</PBt>
            <div style={{ marginTop:18 }}>
              <PLabel color={AMBER}>Países ({data.countries.length})</PLabel>
              {data.countries.map(c => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'#111118', borderRadius:8, marginBottom:5 }}>
                  <span style={{ fontSize:14 }}>{c.flag}</span><span style={{ color:'#ccc', fontSize:11 }}>{c.name}</span>
                  <span style={{ marginLeft:'auto', color:'#555', fontSize:9 }}>{c.categories.length} cats.</span>
                </div>
              ))}
            </div>
          </>}
          {tab==='category' && <>
            <PLabel color={WHITE}>Añadir Categoría</PLabel>
            <SLab>País</SLab>
            <PSel value={form.category.countryId} onChange={v=>setForm(f=>({...f,category:{...f.category,countryId:v}}))}>
              <option value="">Seleccionar país...</option>
              {data.countries.map(c=><option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
            </PSel>
            <SLab>Nombre</SLab><PIn value={form.category.name} onChange={v=>setForm(f=>({...f,category:{...f.category,name:v}}))} ph="Ej: Tecnología"/>
            <SLab>Ícono</SLab>
            <PSel value={form.category.icon} onChange={v=>setForm(f=>({...f,category:{...f.category,icon:v}}))}>
              {ICON_OPTIONS.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
            </PSel>
            <PBt color={WHITE} onClick={addCategory}>+ Añadir Categoría</PBt>
          </>}
          {tab==='company' && <>
            <PLabel color={BLUE}>Añadir Empresa</PLabel>
            <SLab>Categoría</SLab>
            <PSel value={form.company.categoryId} onChange={v=>setForm(f=>({...f,company:{...f.company,categoryId:v}}))}>
              <option value="">Seleccionar categoría...</option>
              {allCategories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </PSel>
            <SLab>Nombre</SLab><PIn value={form.company.name} onChange={v=>setForm(f=>({...f,company:{...f.company,name:v}}))} ph="Ej: PropTech SA"/>
            <PBt color={BLUE} onClick={addCompany}>+ Añadir Empresa</PBt>
          </>}
          {tab==='project' && <>
            <PLabel color={GREEN}>Añadir Proyecto</PLabel>
            <SLab>Empresa</SLab>
            <PSel value={form.project.companyId} onChange={v=>setForm(f=>({...f,project:{...f.project,companyId:v}}))}>
              <option value="">Seleccionar empresa...</option>
              {allCompanies.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </PSel>
            <SLab>Nombre</SLab><PIn value={form.project.name} onChange={v=>setForm(f=>({...f,project:{...f.project,name:v}}))} ph="Ej: Token RWA"/>
            <PBt color={GREEN} onClick={addProject}>+ Añadir Proyecto</PBt>
          </>}
        </div>
      )}
    </div>
  );
}

function PLabel({ color, children }) { return <div style={{ color, fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:10, borderBottom:`1px solid ${color}20`, paddingBottom:6 }}>{children}</div>; }
function SLab({ children }) { return <div style={{ color:'#777', fontSize:9, fontWeight:600, letterSpacing:0.5, textTransform:'uppercase', marginBottom:4, marginTop:10 }}>{children}</div>; }
function PIn({ value, onChange, ph }) { return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} style={{ width:'100%', boxSizing:'border-box', padding:'7px 10px', borderRadius:7, border:'1px solid #2a2a35', background:'#0e0e16', color:'#ddd', fontSize:12, outline:'none', fontFamily:'inherit' }}/>; }
function PSel({ value, onChange, children }) { return <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:'100%', boxSizing:'border-box', padding:'7px 10px', borderRadius:7, border:'1px solid #2a2a35', background:'#0e0e16', color:'#ddd', fontSize:12, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>{children}</select>; }
function PBt({ color, onClick, children }) { return <button onClick={onClick} style={{ marginTop:14, width:'100%', padding:'8px', borderRadius:8, border:`1px solid ${color}50`, background:`${color}14`, color, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>{children}</button>; }
