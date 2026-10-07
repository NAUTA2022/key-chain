import { FaCar, FaBuilding, FaShip, FaMicrochip, FaLeaf, FaIndustry, FaStore, FaTractor } from 'react-icons/fa';
import { MdApartment, MdSolarPower } from 'react-icons/md';

// ─── COLORS ─────────────────────────────────────────────────────────────────
// Light theme palette (names kept from the original dark version).
export const GOLD = '#a8832a', AMBER = '#d97706', WHITE = '#475569', BLUE = '#2563eb', GREEN = '#16a34a', BG = '#f5f6f9';
export const cardColor = (type) => type==='core'?GOLD:type==='country'?AMBER:type==='category'?WHITE:type==='company'?BLUE:GREEN;

// ─── ICONS ──────────────────────────────────────────────────────────────────
export const ICON_MAP = { autos: FaCar, realestate: FaBuilding, containers: FaShip, campo: FaLeaf, tech: FaMicrochip, industria: FaIndustry, comercio: FaStore, agro: FaTractor, energia: MdSolarPower, vivienda: MdApartment };
export const ICON_OPTIONS = [
  { key: 'autos', label: 'Automóviles' }, { key: 'realestate', label: 'Real Estate' },
  { key: 'containers', label: 'Contenedores' }, { key: 'campo', label: 'Campo' },
  { key: 'tech', label: 'Tecnología' }, { key: 'industria', label: 'Industria' },
  { key: 'comercio', label: 'Comercio' }, { key: 'agro', label: 'Agro' },
  { key: 'energia', label: 'Energía' }, { key: 'vivienda', label: 'Vivienda' },
];

// ─── CARD METADATA ──────────────────────────────────────────────────────────
export const COUNTRY_META = {
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
export const CATEGORY_META = {
  autos:      { growth: '+18% anual LAT', legal: 'Ley 27440 + CNV 22/23', benefits: 'Renta mensual, baja volatilidad, respaldo físico', risk: 'Bajo' },
  campo:      { growth: '+22% anual', legal: 'Reg. Prod. Agropecuario', benefits: 'Hedge inflación, activos reales, ciclo estacional', risk: 'Medio' },
  realestate: { growth: '+15% anual', legal: 'Ley 1558 (SFC Colombia)', benefits: 'Apreciación + renta pasiva, liquidez secundaria', risk: 'Bajo' },
  containers: { growth: '+12% anual', legal: 'Ley 23/2015 Panamá', benefits: 'Flujo predecible, demanda global constante', risk: 'Bajo' },
  tech:       { growth: '+35% anual', legal: 'Múltiple jurisdicción', benefits: 'Alto crecimiento, escalable, global', risk: 'Alto' },
};
export const COMPANY_META = {
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
    logo: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&h=1000&fit=crop&auto=format&q=90',
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
    logo: 'https://images.unsplash.com/photo-1571127236794-81c0bbfe1ce3?w=1000&h=1000&fit=crop&auto=format&q=90',
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
    logo: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&h=1000&fit=crop&auto=format&q=90',
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
    logo: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1000&h=1000&fit=crop&auto=format&q=90',
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
    logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000&h=1000&fit=crop&auto=format&q=90',
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
    logo: 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=1000&h=1000&fit=crop&auto=format&q=90',
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
    logo: 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=1000&h=1000&fit=crop&auto=format&q=90',
  },
  lg_ar_autos: {
    apy: 10.1, since: '2022', tokens: 'LG-AR',
    bio: 'LogiGlobal Argentina opera flotas de última milla y telemetría vehicular tokenizada para e-commerce.',
    bannerBg: `linear-gradient(135deg,#0f1a00,#1a2800)`, bannerEmoji: '🚐',
    logo: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1000&h=1000&fit=crop&auto=format&q=90',
  },
  ft_co_re: {
    apy: 8.9, since: '2022', tokens: 'FT-CO',
    bio: 'FinTrust Colombia tokeniza edificios corporativos en el centro financiero de Bogotá.',
    bannerBg: `linear-gradient(135deg,#001020,#001832)`, bannerEmoji: '🏢',
    logo: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1000&h=1000&fit=crop&auto=format&q=90',
  },
  lg_pa_containers: {
    apy: 8.3, since: '2022', tokens: 'LG-PA',
    bio: 'LogiGlobal Panamá gestiona operaciones de trasbordo y equipo portuario en el Canal de Panamá.',
    bannerBg: `linear-gradient(135deg,#000d20,#001836)`, bannerEmoji: '🏗️',
    logo: 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=1000&h=1000&fit=crop&auto=format&q=90',
  },
  ft_pa_containers: {
    apy: 8.1, since: '2022', tokens: 'FT-PA',
    bio: 'FinTrust Panamá invierte en infraestructura de contenedores en el Hub logístico de Balboa.',
    bannerBg: `linear-gradient(135deg,#00101a,#001c2e)`, bannerEmoji: '📦',
    logo: 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=1000&h=1000&fit=crop&auto=format&q=90',
  },
};
export const PROJECT_META = {
  'am-fleet': {
    apy: 8.5, min: 500, dur: '24m', type: 'Flota Vehicular RWA', status: 'Activo', filled: 78,
    description: 'Flota de 45 vehículos gestionados y tokenizados con respaldo físico certificado. Renta mensual distribuida en USDC cada 30 días. Contratos de arrendamiento operativo de 24 meses.',
    trust_score: 85, security_score: 82, decentralization_score: 60,
    photos: [{ emoji:'🚗', label:'Flota Principal', bg:'#1a0a00', url:'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'🏭', label:'Centro de Operaciones', bg:'#0d1400' },{ emoji:'📋', label:'Certificación Legal', bg:'#0a0a1a' }],
    tokenomics: { supply:'500,000 FLUX', price:'$1 USDC', holders:'312', liquidity:'$180k', distribution:[['Inversores','80%'],['Reserva Operativa','12%'],['Equipo','8%']] },
    docs: [{ title:'Prospecto de Inversión FLEET-24', type:'PDF' },{ title:'Auditoría EY — Q1 2024', type:'PDF' },{ title:'Certificado de Titularidad Vehicular', type:'Legal' }],
  },
  'am-loans': {
    apy: 12.0, min: 200, dur: '12m', type: 'Crédito Auto-colateralizado', status: 'Activo', filled: 91,
    description: 'Créditos colateralizados con vehículos físicos. LTV máximo 70%. Score crediticio mínimo 650. Mora histórica <2.1%. Los fondos se prestan a compradores verificados con respaldo del activo.',
    trust_score: 91, security_score: 88, decentralization_score: 55,
    photos: [{ emoji:'💳', label:'Proceso de Crédito', bg:'#1a1a00', url:'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'🔒', label:'Colateral Verificado', bg:'#001a10' }],
    tokenomics: { supply:'200,000 LOAN', price:'$1 USDC', holders:'528', liquidity:'$95k', distribution:[['Pool de Crédito','85%'],['Reserva de Mora','10%'],['Gestión','5%']] },
    docs: [{ title:'Reglamento de Crédito LOANS-12', type:'PDF' },{ title:'Informe Mora Q4 2023', type:'Reporte' },{ title:'Marco Legal CNV — Crédito Digital', type:'Legal' }],
  },
  'cr-token': {
    apy: 11.2, min: 300, dur: '18m', type: 'Renta de vehículos', status: 'Activo', filled: 55,
    description: 'Renta diaria de flota vehicular tokenizada. Ingresos de alquiler distribuidos semanalmente. 15 vehículos activos en CABA y Córdoba con ocupación promedio 78%.',
    trust_score: 72, security_score: 70, decentralization_score: 58,
    photos: [{ emoji:'🚙', label:'Flota de Renta', bg:'#0d1a00', url:'https://images.unsplash.com/photo-1571127236794-81c0bbfe1ce3?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'📍', label:'Cobertura Geográfica', bg:'#001a1a' },{ emoji:'📈', label:'Métricas de Ocupación', bg:'#1a001a' }],
    tokenomics: { supply:'300,000 CRN', price:'$1 USDC', holders:'187', liquidity:'$62k', distribution:[['Pool Renta','75%'],['Mantenimiento','15%'],['Equipo','10%']] },
    docs: [{ title:'Prospecto CRN-18', type:'PDF' },{ title:'Contratos de Arrendamiento', type:'Legal' }],
  },
  'ag-soy': {
    apy: 14.0, min: 1000, dur: '6m', type: 'Cosecha Soja RWA', status: 'Activo', filled: 88,
    description: 'Tokenización de 5,000 toneladas de soja almacenadas en silos certificados en Santa Fe. Precio fijado a futuro. Auditoría de stock mensual por PwC. El activo más demandado del ecosistema.',
    trust_score: 92, security_score: 90, decentralization_score: 62,
    photos: [{ emoji:'🌱', label:'Siembra Certificada', bg:'#001a00', url:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'🏗️', label:'Silo Autorizado CNV', bg:'#001400' },{ emoji:'⚖️', label:'Pesaje y Control', bg:'#0a1400' },{ emoji:'📦', label:'Stock Tokenizado', bg:'#141400' }],
    tokenomics: { supply:'1,000,000 AGRC-SOY', price:'$1 USDC', holders:'445', liquidity:'$420k', distribution:[['Cosecha Real','90%'],['Seguro Climático','6%'],['Gestión','4%']] },
    docs: [{ title:'Prospecto AGRC-SOY-6M', type:'PDF' },{ title:'Auditoría PwC Stock Soja', type:'Auditoría' },{ title:'Póliza Seguro Climático Mapfre', type:'Seguro' },{ title:'Certificado SENASA', type:'Certificación' }],
  },
  'ag-corn': {
    apy: 10.5, min: 500, dur: '6m', type: 'Cosecha Maíz RWA', status: 'Lanzando', filled: 34,
    description: 'Segunda cosecha tokenizada de AgriChain. 3,000 tn de maíz de la campaña 2024/25. Período de captación activo. Cierre en 60 días. Entrega de rendimientos al final del ciclo.',
    trust_score: 78, security_score: 75, decentralization_score: 60,
    photos: [{ emoji:'🌽', label:'Cultivo 2024/25', bg:'#1a1400', url:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'🚜', label:'Maquinaria Propia', bg:'#141a00' }],
    tokenomics: { supply:'500,000 AGRC-CORN', price:'$1 USDC', holders:'134', liquidity:'$38k', distribution:[['Cosecha Real','88%'],['Seguro Climático','7%'],['Gestión','5%']] },
    docs: [{ title:'Prospecto AGRC-CORN-6M', type:'PDF' },{ title:'Proyección Cosecha 2024', type:'Reporte' }],
  },
  'tt-land': {
    apy: 12.5, min: 2000, dur: '36m', type: 'Tierra Productiva', status: 'Activo', filled: 62,
    description: '500 hectáreas de tierra agrícola de alta productividad en Entre Ríos, Argentina. Arrendamiento a productor AAA con garantía hipotecaria. Renta semestral en USDC.',
    trust_score: 80, security_score: 85, decentralization_score: 48,
    photos: [{ emoji:'🌿', label:'Campo Principal', bg:'#001a00', url:'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'🗺️', label:'Vista Satelital', bg:'#001400' },{ emoji:'📜', label:'Escrituras Digitalizadas', bg:'#0a0a14' }],
    tokenomics: { supply:'250,000 TTTK', price:'$2 USDC', holders:'98', liquidity:'$210k', distribution:[['Tierra Real','85%'],['Operaciones','10%'],['Equipo','5%']] },
    docs: [{ title:'Escritura Pública Digitalizada', type:'Legal' },{ title:'Tasación Oficial CAME', type:'Valuación' },{ title:'Contrato de Arrendamiento', type:'Legal' }],
  },
  'pc-apt': {
    apy: 9.8, min: 500, dur: '24m', type: 'Apartamentos tokenizados', status: 'Activo', filled: 73,
    description: '12 apartamentos tokenizados en Bogotá Norte y El Poblado Medellín. Renta mensual + apreciación de capital al vencimiento. Administración profesional incluida.',
    trust_score: 83, security_score: 80, decentralization_score: 52,
    photos: [{ emoji:'🏠', label:'Aptos Bogotá Norte', bg:'#001020', url:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'🌆', label:'Medellín El Poblado', bg:'#000d1a' },{ emoji:'🛋️', label:'Interior Tipo', bg:'#0a0014' }],
    tokenomics: { supply:'400,000 PROP-APT', price:'$1 USDC', holders:'267', liquidity:'$155k', distribution:[['Inmuebles','80%'],['Administración','12%'],['Equipo','8%']] },
    docs: [{ title:'Prospecto PROP-APT-24', type:'PDF' },{ title:'Certificado SFC Sandbox', type:'Regulación' },{ title:'Avalúo Lonja Propiedad Raíz', type:'Valuación' }],
  },
  'pc-com': {
    apy: 7.5, min: 1000, dur: '36m', type: 'Oficinas comerciales', status: 'Activo', filled: 45,
    description: 'Portafolio de oficinas class A en Bogotá Financial District. Arrendatarios corporativos con contratos a 36 meses. Renta trimestral estable.',
    trust_score: 70, security_score: 78, decentralization_score: 44,
    photos: [{ emoji:'🏢', label:'Torre Financiera', bg:'#00101a', url:'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'💼', label:'Espacios Corporativos', bg:'#001018' }],
    tokenomics: { supply:'300,000 PROP-COM', price:'$1 USDC', holders:'112', liquidity:'$88k', distribution:[['Inmuebles','82%'],['Administración','10%'],['Reserva','8%']] },
    docs: [{ title:'Prospecto PROP-COM-36', type:'PDF' },{ title:'Contratos Arrendatarios', type:'Legal' }],
  },
  'st-20': {
    apy: 8.0, min: 2000, dur: '12m', type: 'Contenedor 20ft RWA', status: 'Activo', filled: 90,
    description: '80 contenedores de 20 pies tokenizados en el Puerto de Balboa, Panamá. Arrendamiento a navieras tier-1. Demanda garantizada por contratos de 12 meses renovables.',
    trust_score: 94, security_score: 92, decentralization_score: 70,
    photos: [{ emoji:'📦', label:'Contenedores 20ft', bg:'#00101a', url:'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'⚓', label:'Puerto de Balboa', bg:'#000d20' },{ emoji:'🌊', label:'Operaciones Canal', bg:'#001020' }],
    tokenomics: { supply:'160,000 SEA-20', price:'$1 USDC', holders:'356', liquidity:'$195k', distribution:[['Contenedores','85%'],['Seguro Marítimo','8%'],['Gestión','7%']] },
    docs: [{ title:'Prospecto SEA-20-12M', type:'PDF' },{ title:'Contratos Naviera MSC', type:'Legal' },{ title:"Póliza Lloyd's of London", type:'Seguro' }],
  },
  'st-40': {
    apy: 9.0, min: 3000, dur: '12m', type: 'Contenedor 40ft RWA', status: 'Activo', filled: 67,
    description: '40 contenedores de 40 pies en rutas de alto volumen Asia-LATAM. Mayor capacidad y renta por unidad. Contratos con Maersk y CMA-CGM.',
    trust_score: 87, security_score: 88, decentralization_score: 68,
    photos: [{ emoji:'🚢', label:'Ruta Asia-LATAM', bg:'#000d20', url:'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'📦', label:'Contenedores 40ft', bg:'#001020' }],
    tokenomics: { supply:'120,000 SEA-40', price:'$1 USDC', holders:'203', liquidity:'$145k', distribution:[['Contenedores','83%'],['Seguro','9%'],['Gestión','8%']] },
    docs: [{ title:'Prospecto SEA-40-12M', type:'PDF' },{ title:'Contratos Maersk / CMA-CGM', type:'Legal' }],
  },
  'nc-bulk': {
    apy: 7.5, min: 5000, dur: '18m', type: 'Carga a granel', status: 'Activo', filled: 48,
    description: 'Tokenización de operaciones de carga a granel (soja, maíz, trigo) en rutas LATAM-Asia. Naviero exclusivo con flota propia de 3 graneleros.',
    trust_score: 65, security_score: 72, decentralization_score: 58,
    photos: [{ emoji:'⚓', label:'Puerto Granelero', bg:'#00101a', url:'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'🌾', label:'Carga Agrícola', bg:'#001400' }],
    tokenomics: { supply:'100,000 NAVI-BLK', price:'$1 USDC', holders:'78', liquidity:'$62k', distribution:[['Operaciones','80%'],['Reserva','12%'],['Equipo','8%']] },
    docs: [{ title:'Prospecto NAVI-BLK-18M', type:'PDF' },{ title:'Certificado IMO Granelero', type:'Certificación' }],
  },
  'lg-ar-01': {
    apy: 10.8, min: 400, dur: '18m', type: 'Flota Logística RWA', status: 'Activo', filled: 58,
    description: 'FleetLogic AR tokeniza la flota de última milla de LogiGlobal en Buenos Aires. 30 furgonetas eléctricas con contratos de reparto para e-commerce tier-1.',
    trust_score: 81, security_score: 79, decentralization_score: 56,
    photos: [{ emoji:'🚐', label:'Flota Eléctrica', bg:'#0d1a00', url:'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'📦', label:'Centro de Distribución', bg:'#001a10' }],
    tokenomics: { supply:'220,000 LG-AR1', price:'$1 USDC', holders:'145', liquidity:'$74k', distribution:[['Flota Real','82%'],['Mantenimiento','10%'],['Equipo','8%']] },
    docs: [{ title:'Prospecto LG-AR1-18M', type:'PDF' },{ title:'Contratos de Reparto E-commerce', type:'Legal' }],
  },
  'lg-ar-02': {
    apy: 9.4, min: 300, dur: '12m', type: 'Telemetría y Tracking RWA', status: 'Lanzando', filled: 22,
    description: 'AutoTrack financia hardware de rastreo GPS instalado en la flota de LogiGlobal. Ingresos por licenciamiento de datos de telemetría a aseguradoras.',
    trust_score: 68, security_score: 74, decentralization_score: 52,
    photos: [{ emoji:'📡', label:'Hardware GPS', bg:'#001a1a', url:'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'🗺️', label:'Dashboard de Flota', bg:'#0a0a1a' }],
    tokenomics: { supply:'150,000 LG-AR2', price:'$1 USDC', holders:'63', liquidity:'$29k', distribution:[['Hardware','75%'],['I+D','15%'],['Equipo','10%']] },
    docs: [{ title:'Prospecto LG-AR2-12M', type:'PDF' },{ title:'Acuerdo de Licencia de Datos', type:'Legal' }],
  },
  'ft-co-01': {
    apy: 8.9, min: 600, dur: '30m', type: 'Edificio Tokenizado', status: 'Activo', filled: 69,
    description: 'FinTrust tokeniza un edificio corporativo de 8 pisos en el centro financiero de Bogotá. Arrendatarios institucionales con contratos a 5 años.',
    trust_score: 84, security_score: 81, decentralization_score: 50,
    photos: [{ emoji:'🏢', label:'Edificio Corporativo', bg:'#00101a', url:'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'📄', label:'Contratos de Arrendamiento', bg:'#0a0a14' }],
    tokenomics: { supply:'350,000 FT-CO1', price:'$1 USDC', holders:'201', liquidity:'$132k', distribution:[['Inmueble','85%'],['Administración','9%'],['Equipo','6%']] },
    docs: [{ title:'Prospecto FT-CO1-30M', type:'PDF' },{ title:'Avalúo Comercial Bogotá', type:'Valuación' }],
  },
  'lg-pa-01': {
    apy: 8.3, min: 800, dur: '18m', type: 'Logística Portuaria RWA', status: 'Activo', filled: 40,
    description: 'CanalLogic tokeniza operaciones de trasbordo en el Canal de Panamá — grúas y equipo de manejo de contenedores compartido entre navieras.',
    trust_score: 77, security_score: 80, decentralization_score: 54,
    photos: [{ emoji:'🏗️', label:'Grúas Pórtico', bg:'#00101a', url:'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'🚢', label:'Trasbordo Canal', bg:'#000d20' }],
    tokenomics: { supply:'180,000 LG-PA1', price:'$1 USDC', holders:'92', liquidity:'$58k', distribution:[['Equipo Portuario','80%'],['Seguro','12%'],['Gestión','8%']] },
    docs: [{ title:'Prospecto LG-PA1-18M', type:'PDF' },{ title:'Concesión ACP', type:'Legal' }],
  },
  'ft-pa-01': {
    apy: 8.1, min: 700, dur: '24m', type: 'Infraestructura Portuaria RWA', status: 'Activo', filled: 51,
    description: 'PortFinance financia la modernización de infraestructura de contenedores en el Hub logístico de Balboa, Panamá, con ingresos por tarifas de manejo de carga.',
    trust_score: 79, security_score: 82, decentralization_score: 50,
    photos: [{ emoji:'📦', label:'Hub de Balboa', bg:'#00101a', url:'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=900&h=560&fit=crop&auto=format&q=80' },{ emoji:'⚓', label:'Terminal de Contenedores', bg:'#000d20' }],
    tokenomics: { supply:'200,000 FT-PA1', price:'$1 USDC', holders:'87', liquidity:'$66k', distribution:[['Infraestructura','83%'],['Seguro','9%'],['Gestión','8%']] },
    docs: [{ title:'Prospecto FT-PA1-24M', type:'PDF' },{ title:'Concesión Portuaria Balboa', type:'Legal' }],
  },
};

// ─── INITIAL DATA ────────────────────────────────────────────────────────────
// crossLinks: companies that appear in multiple categories/countries share a groupId.
// Each occurrence is a distinct node; carousel navigation connects them.
export const INITIAL_DATA = {
  crossLinks: [
    { groupId: 'logiglobal', name: 'LogiGlobal', nodeIds: ['lg_ar_autos', 'lg_pa_containers'] },
    { groupId: 'fintrust',   name: 'FinTrust',   nodeIds: ['ft_co_re',    'ft_pa_containers'] },
  ],
  countries: [
    { id: 'argentina', name: 'Argentina', flag: '🇦🇷', categories: [
      { id: 'autos', name: 'Automóviles', icon: 'autos', companies: [
        { id: 'automax',     name: 'AutoMax',     projects: [{ id: 'am-fleet', name: 'Fleet RWA' }, { id: 'am-loans', name: 'Auto Loans' }] },
        { id: 'carrent',     name: 'CarRent Pro', projects: [{ id: 'cr-token', name: 'Token Renta' }] },
        { id: 'lg_ar_autos', name: 'LogiGlobal',  groupId: 'logiglobal', projects: [{ id: 'lg-ar-01', name: 'FleetLogic AR' }, { id: 'lg-ar-02', name: 'AutoTrack' }] },
      ]},
      { id: 'campo', name: 'Campo', icon: 'campo', companies: [
        { id: 'agrichain', name: 'AgriChain', projects: [{ id: 'ag-soy', name: 'Soja Token' }, { id: 'ag-corn', name: 'Maíz RWA' }] },
        { id: 'tierratok', name: 'TierraTok', projects: [{ id: 'tt-land', name: 'Tierra Prod.' }] },
      ]},
    ]},
    { id: 'colombia', name: 'Colombia', flag: '🇨🇴', categories: [
      { id: 'realestate', name: 'Real Estate', icon: 'realestate', companies: [
        { id: 'propchain', name: 'PropChain', projects: [{ id: 'pc-apt', name: 'Aptos RWA' }, { id: 'pc-com', name: 'Comercial' }] },
        { id: 'ft_co_re',  name: 'FinTrust',  groupId: 'fintrust',    projects: [{ id: 'ft-co-01', name: 'Edificio Token CO' }] },
      ]},
    ]},
    { id: 'panama', name: 'Panamá', flag: '🇵🇦', categories: [
      { id: 'containers', name: 'Contenedores', icon: 'containers', companies: [
        { id: 'seatoken',       name: 'SeaToken',   projects: [{ id: 'st-20', name: 'Container 20ft' }, { id: 'st-40', name: 'Container 40ft' }] },
        { id: 'navichain',      name: 'NaviChain',  projects: [{ id: 'nc-bulk', name: 'Bulk Cargo' }] },
        { id: 'lg_pa_containers', name: 'LogiGlobal', groupId: 'logiglobal', projects: [{ id: 'lg-pa-01', name: 'CanalLogic' }] },
        { id: 'ft_pa_containers', name: 'FinTrust',   groupId: 'fintrust',   projects: [{ id: 'ft-pa-01', name: 'PortFinance' }] },
      ]},
    ]},
  ],
};

export const uid = () => Math.random().toString(36).slice(2, 8);
