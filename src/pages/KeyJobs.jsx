import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveAccount, useDisconnect } from 'thirdweb/react';
import KeyPayLogin from './KeyPayLogin';
import { RWA_ASSETS, RWA_COMPANIES } from '../data';
import { useMobile } from '../hooks/useMobile';

const DESKTOP_BP = 900;
const PANEL_WIDTH = 420;

// ─── Design tokens — the glossy blue/white job-app look from the moodboard:
// gradient hero cards, colorful rounded-square app-icon logos, pill CTAs
// that float half off the card edge — not the platform's flat design system
// (same reasoning as Bookey being self-themed) ──────────────────────────────
const BG      = '#EFF4FC';
const CARD    = '#FFFFFF';
const BLUE    = '#2F6FED';
const BLUE_D  = '#1638A6';
const BLUE_GRAD = 'linear-gradient(135deg, #5B93FF 0%, #2F6FED 55%, #1D4ED8 100%)';
const SKY_GRAD = 'linear-gradient(180deg, #DCE9FF 0%, #EFF4FC 100%)';
const INK     = '#0B1220';
const SUB     = '#64748B';
const BORDER  = '#E6EAF2';
const TAG_BG  = '#0F172A';
const GREEN   = '#16A34A';
const GOLD    = '#F5A623';
const RED     = '#e11900';
const SHADOW_CARD = '0 2px 10px rgba(15,23,42,0.06)';
const SHADOW_BLUE = '0 14px 30px rgba(47,111,237,0.32)';
const FONT_H = 'var(--font-h)';
const FONT_B = 'var(--font-b)';

// ─── Icons ────────────────────────────────────────────────────────────────────
const JIcons = {
  home:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10"/></svg>,
  briefcase:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  user:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  building: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 21V5a1 1 0 011-1h6a1 1 0 011 1v16M4 21h16M12 21V9h6a1 1 0 011 1v11M8 8h.01M8 12h.01M8 16h.01"/></svg>,
  search:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  heart:    (filled) => <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? RED : 'none'} stroke={filled ? RED : 'currentColor'} strokeWidth="1.8"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2 4.5 5.8 4.5c2.2 0 3.7 1.2 4.7 2.7C11.5 5.7 13 4.5 15.2 4.5 19 4.5 20.6 8.4 22 11.7 19.5 16.4 12 21 12 21z"/></svg>,
  comment:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  thumbsUp: (filled) => <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? BLUE : 'none'} stroke={filled ? BLUE : 'currentColor'} strokeWidth="1.8"><path d="M7 11v10H4a1 1 0 01-1-1v-8a1 1 0 011-1h3zm0 0l4-8a2 2 0 012 2v4h5.5a2 2 0 011.9 2.7l-2.1 6A2 2 0 0116.4 21H7"/></svg>,
  image:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="M21 15l-5-5-9 9"/></svg>,
  video:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 10l5-3v10l-5-3"/></svg>,
  play:     <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>,
  plus:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  link:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 17H7a5 5 0 010-10h2M15 7h2a5 5 0 010 10h-2M8 12h8"/></svg>,
  star:     (filled) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? GOLD : 'none'} stroke={filled ? GOLD : 'currentColor'} strokeWidth="1.6"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1L12 2z"/></svg>,
  pin:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>,
  clock:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>,
  chevronLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  logout:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  checkCircle: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  close:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  edit:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  grad:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M12 4L2 9l10 5 10-5-10-5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/></svg>,
  x:        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  bookmark: (filled) => <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z"/></svg>,
  share:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.7l7.4-4M8.3 13.3l7.4 4"/></svg>,
  bell:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M9.5 18a2.5 2.5 0 005 0"/></svg>,
};

// Colorful app-icon gradients, like the reference's rounded-square company
// logos — every company gets a distinct vivid gradient, not a flat tint.
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #FF7A59, #FF3D68)',
  'linear-gradient(135deg, #34D399, #0EA5A0)',
  'linear-gradient(135deg, #6D5EF9, #A855F7)',
  'linear-gradient(135deg, #FFB020, #FF7A00)',
  'linear-gradient(135deg, #38BDF8, #2F6FED)',
  'linear-gradient(135deg, #FF6BB5, #C026D3)',
  'linear-gradient(135deg, #84CC16, #16A34A)',
  'linear-gradient(135deg, #FB923C, #EF4444)',
];
function hashStr(s = '') { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function avatarGradient(name) { return AVATAR_GRADIENTS[hashStr(name) % AVATAR_GRADIENTS.length]; }
function initials(name = '') { return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }

function Avatar({ name, size = 40, square = false }) {
  return (
    <div style={{ width: size, height: size, borderRadius: square ? size * 0.3 : '50%', background: name === 'KEYCHAIN' ? BLUE_GRAD : avatarGradient(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_H, fontWeight: 700, fontSize: size * 0.38, flexShrink: 0, boxShadow: square ? '0 4px 10px rgba(15,23,42,0.18)' : 'none' }}>
      {initials(name)}
    </div>
  );
}

function Tag({ children, style = {} }) {
  return <span style={{ padding: '5px 11px', borderRadius: 999, background: TAG_BG, color: '#fff', fontFamily: FONT_B, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', ...style }}>{children}</span>;
}

// ─── Featured job — the glossy gradient hero card from the moodboard, with
// a pill CTA that floats half off the card's bottom-right corner ───────────
function FeaturedJobCard({ job, onOpen }) {
  const salaryLabel = job.salaryMin === job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : `$${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 700 }}>Destacado</div>
      <div style={{ position: 'relative', background: BLUE_GRAD, borderRadius: 24, padding: '20px 22px 26px', boxShadow: SHADOW_BLUE, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.14)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_H, fontWeight: 800, color: '#fff', fontSize: 17, flexShrink: 0 }}>{initials(job.company)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT_B, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{job.company}</div>
            <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 16, color: '#fff', marginTop: 1 }}>{job.title}</div>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
          {job.tags.slice(0, 3).map(t => (
            <span key={t} style={{ padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.2)', color: '#fff', fontFamily: FONT_B, fontWeight: 600, fontSize: 11 }}>{t}</span>
          ))}
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 20, color: '#fff' }}>{salaryLabel}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: 'rgba(255,255,255,0.8)' }}>/{job.unit}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -18, paddingRight: 18, position: 'relative' }}>
        <motion.button onClick={onOpen} whileHover={{ y: -1, boxShadow: '0 10px 22px rgba(15,23,42,0.24)' }} whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 999, border: 'none', background: '#fff', color: BLUE_D, fontFamily: FONT_H, fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 8px 18px rgba(15,23,42,0.18)' }}>
          Ver empleo <span style={{ fontSize: 15 }}>→</span>
        </motion.button>
      </div>
    </div>
  );
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const palermoAsset = RWA_ASSETS.find(a => a.name === 'Edificio Corporativo Palermo');
const teslaAsset   = RWA_ASSETS.find(a => a.name === 'Flota Tesla Model 3');
const agroAsset    = RWA_ASSETS.find(a => a.name === 'Campo Agrícola Pergamino');

const SKILLS_POOL = ['Gestión de propiedades', 'Atención al cliente', 'Excel', 'Licencia de conducir', 'Mantenimiento', 'Figma', 'Prototipado', 'UI Design', 'React', 'React Native', 'iOS/Android', 'API', 'Ventas', 'Inglés avanzado', 'Gestión agrícola', 'Vehículos eléctricos'];

const KEYCHAIN_COMPANIES = ['KEYCHAIN', ...RWA_COMPANIES.filter(c => c !== 'Todos')];

const SEED_JOBS = [
  { id: 'j1', company: 'PropChain', keychainLinked: true, linkedAsset: palermoAsset?.name, title: 'Property Manager — Edificio Corporativo Palermo', category: 'Gestión de Propiedades',
    tags: ['Gestión de propiedades', 'Atención al cliente', 'Excel'], salaryMin: 1200, salaryMax: 1800, unit: 'mes', type: 'Presencial', commitment: 'Tiempo completo',
    location: 'CABA, Argentina', postedAgo: '2 horas', applicants: 14,
    description: 'PropChain busca un/a Property Manager para administrar el Edificio Corporativo Palermo, un activo tokenizado con 94% de ocupación e inquilinos corporativos.',
    responsibilities: ['Gestionar la relación con inquilinos y renovación de contratos', 'Coordinar mantenimiento y proveedores del edificio', 'Reportar mensualmente a los holders del token vía KEYCHAIN', 'Supervisar cobranzas y gastos operativos'] },
  { id: 'j2', company: 'KEYCHAIN', keychainLinked: true, linkedAsset: teslaAsset?.name, title: 'Conductor — Flota Key Go', category: 'Conductor',
    tags: ['Licencia de conducir', 'Atención al cliente'], salaryMin: 900, salaryMax: 1600, unit: 'mes', type: 'Presencial', commitment: 'Full o part-time',
    location: 'Buenos Aires, Argentina', postedAgo: '5 horas', applicants: 37,
    description: 'Manejá autos tokenizados de la flota Key Go (Tesla Model 3 y más) en la plataforma de ride-hailing de KEYCHAIN. Horarios flexibles y bono por rendimiento.',
    responsibilities: ['Realizar viajes solicitados a través de la app Key Go', 'Mantener el vehículo limpio y en buen estado', 'Brindar una experiencia de viaje segura y amable', 'Cumplir con los estándares de seguridad de la flota'] },
  { id: 'j3', company: 'AutoMax', keychainLinked: false, title: 'Técnico de Mantenimiento — Flota Tesla Model 3', category: 'Mantenimiento',
    tags: ['Mantenimiento', 'Vehículos eléctricos'], salaryMin: 1500, salaryMax: 2000, unit: 'mes', type: 'Presencial', commitment: 'Tiempo completo',
    location: 'Los Ángeles, EE.UU.', postedAgo: '1 día', applicants: 6,
    description: 'AutoMax necesita un técnico especializado en vehículos eléctricos para el mantenimiento preventivo y correctivo de su flota tokenizada de Tesla Model 3.',
    responsibilities: ['Mantenimiento preventivo de la flota eléctrica', 'Diagnóstico y reparación de fallas', 'Registro de servicios en el sistema de flota', 'Coordinación con el equipo de operaciones'] },
  { id: 'j4', company: 'TechCorp Inc.', keychainLinked: false, title: 'Senior UI/UX Designer', category: 'Diseño',
    tags: ['Figma', 'Prototipado', 'UI Design', 'Remoto'], salaryMin: 45, salaryMax: 60, unit: 'hora', type: 'Remoto', commitment: '30+ hs/semana',
    location: 'Remoto', postedAgo: '2 horas', applicants: 21,
    description: 'Buscamos un/a Senior UI/UX Designer para unirse a nuestro equipo de producto y diseñar interfaces intuitivas para aplicaciones web y móviles.',
    responsibilities: ['Crear user flows, wireframes y prototipos de alta fidelidad', 'Conducir investigación de usuarios y sintetizar feedback', 'Colaborar con desarrollo para implementar los diseños', 'Mantener el design system actualizado'] },
  { id: 'j5', company: 'Startup Innovators', keychainLinked: false, title: 'React Native Developer', category: 'Desarrollo',
    tags: ['React Native', 'iOS/Android', 'API'], salaryMin: 3500, salaryMax: 3500, unit: 'proyecto fijo', type: 'Remoto', commitment: 'Freelance',
    location: 'Remoto', postedAgo: '5 horas', applicants: 9,
    description: 'Proyecto fijo para desarrollar funcionalidades nuevas en una app React Native ya en producción, integrando APIs propias.',
    responsibilities: ['Desarrollar pantallas y flujos nuevos en React Native', 'Integrar APIs REST propias', 'Escribir tests unitarios', 'Participar en code review'] },
  { id: 'j6', company: 'AgroToken', keychainLinked: false, linkedAsset: agroAsset?.name, title: 'Supervisor de Campo — Pergamino', category: 'Agro',
    tags: ['Gestión agrícola', 'Excel'], salaryMin: 900, salaryMax: 1300, unit: 'mes', type: 'Presencial', commitment: 'Tiempo completo',
    location: 'Buenos Aires, Argentina', postedAgo: '1 día', applicants: 4,
    description: 'AgroToken busca un/a supervisor/a de campo para el Campo Agrícola Pergamino, 240 hectáreas de soja y maíz en zona núcleo.',
    responsibilities: ['Supervisar labores agrícolas y personal de campo', 'Reportar rindes y avances a la consultora agronómica', 'Coordinar logística de insumos y cosecha', 'Mantener registros para los holders del token'] },
];

const SEED_POSTS = [
  { id: 'p1', authorType: 'company', name: 'PropChain', role: 'Real Estate tokenizado · KEYCHAIN', content: 'Estamos buscando Property Manager para el Edificio Corporativo Palermo 🏢 Si te apasiona la gestión inmobiliaria, mirá el puesto en Empleos.', image: palermoAsset?.img, likes: 34, comments: [{ author: 'Martina Ibáñez', text: '¡Me postulé! 🙌' }], recommended: [] },
  { id: 'p2', authorType: 'user', name: 'Max', role: 'Conductor en Key Go', content: '¡Contento de compartir que empecé como conductor en Key Go! 🚗 Gracias al equipo por la oportunidad, horarios flexibles y muy buena onda.', likes: 58, comments: [{ author: 'Sofía Gómez', text: '¡Felicitaciones! Yo también manejo para Key Go, es una gran experiencia.' }, { author: 'KEYCHAIN', text: '🎉 Bienvenido a la flota, Max!' }], recommended: ['KEYCHAIN'] },
  { id: 'p3', authorType: 'company', name: 'KEYCHAIN', role: 'Plataforma de tokenización RWA', content: 'Conocé cómo tokenizamos nuestra flota de Tesla Model 3 y la ponemos a producir con Key Go 🎥', video: true, likes: 112, comments: [], recommended: [] },
  { id: 'p4', authorType: 'company', name: 'AgroToken', role: 'Agro tokenizado', content: 'Cerramos la cosecha con rinde récord en el Campo Agrícola Pergamino 🌾 Buscamos sumar un/a Supervisor/a de Campo — ver Empleos.', likes: 21, comments: [], recommended: [] },
];

const SEED_PROFILE = {
  name: 'Max',
  headline: 'Buscando oportunidades en Real Estate & Movilidad',
  location: 'Buenos Aires, Argentina',
  about: 'Profesional orientado a resultados con experiencia en atención al cliente y gestión operativa. Actualmente conduciendo para Key Go mientras busco un rol estable en property management.',
  experience: [
    { id: 'e1', role: 'Conductor', company: 'Key Go (KEYCHAIN)', period: '2026 — Presente', desc: 'Viajes de ride-hailing en la flota tokenizada de Key Go.' },
  ],
  education: [
    { id: 'ed1', school: 'Universidad de Buenos Aires', degree: 'Lic. en Administración', period: '2018 — 2023' },
  ],
  skills: ['Atención al cliente', 'Licencia de conducir', 'Excel'],
  recommendations: [
    { from: 'KEYCHAIN', relation: 'Empleador en Key Go', text: 'Max es puntual, confiable y siempre recibe excelentes calificaciones de los pasajeros.' },
  ],
};

// ─── Post composer + feed ─────────────────────────────────────────────────────
function Composer({ myName, onPost }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [attach, setAttach] = useState(null); // null | 'image' | 'video'

  const submit = () => {
    if (!text.trim()) return;
    onPost({ content: text.trim(), image: attach === 'image' ? (imgUrl || null) : null, video: attach === 'video' });
    setText(''); setImgUrl(''); setAttach(null); setOpen(false);
  };

  return (
    <div style={{ background: CARD, borderRadius: 16, border: 'none', boxShadow: SHADOW_CARD, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: open ? 'flex-start' : 'center' }}>
        <Avatar name={myName} size={40} />
        {!open ? (
          <button onClick={() => setOpen(true)} style={{ flex: 1, textAlign: 'left', padding: '11px 16px', borderRadius: 999, border: 'none', boxShadow: SHADOW_CARD, background: BG, color: SUB, fontFamily: FONT_B, fontSize: 13.5, cursor: 'pointer' }}>
            ¿Qué querés compartir?
          </button>
        ) : (
          <div style={{ flex: 1 }}>
            <textarea value={text} onChange={e => setText(e.target.value)} autoFocus placeholder="¿Qué querés compartir?" rows={3}
              style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', resize: 'none', fontFamily: FONT_B, fontSize: 14, color: INK, background: 'transparent' }} />
            {attach === 'image' && (
              <input value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder="URL de la imagen (opcional)"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 10, border: 'none', boxShadow: SHADOW_CARD, fontFamily: FONT_B, fontSize: 12.5, marginBottom: 10, outline: 'none' }} />
            )}
            {attach === 'video' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: BG, fontFamily: FONT_B, fontSize: 12.5, color: SUB, marginBottom: 10 }}>
                {JIcons.video} Video adjunto (demo)
              </div>
            )}
          </div>
        )}
      </div>
      {open && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setAttach(a => a === 'image' ? null : 'image')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, border: `1px solid ${attach === 'image' ? BLUE : BORDER}`, background: attach === 'image' ? `${BLUE}12` : 'none', color: attach === 'image' ? BLUE : SUB, fontFamily: FONT_B, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              {JIcons.image} Foto
            </button>
            <button onClick={() => setAttach(a => a === 'video' ? null : 'video')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, border: `1px solid ${attach === 'video' ? BLUE : BORDER}`, background: attach === 'video' ? `${BLUE}12` : 'none', color: attach === 'video' ? BLUE : SUB, fontFamily: FONT_B, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              {JIcons.video} Video
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setOpen(false); setText(''); setAttach(null); }} style={{ padding: '8px 14px', borderRadius: 999, border: 'none', background: 'none', color: SUB, fontFamily: FONT_B, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={submit} disabled={!text.trim()} style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: text.trim() ? BLUE : BORDER, color: '#fff', fontFamily: FONT_B, fontWeight: 700, fontSize: 12.5, cursor: text.trim() ? 'pointer' : 'default' }}>Publicar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, myName, onToggle }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const iRecommended = post.recommended.includes(myName);

  const addComment = () => {
    if (!commentText.trim()) return;
    onToggle(post.id, 'comment', { author: myName, text: commentText.trim() });
    setCommentText('');
  };

  return (
    <div style={{ background: CARD, borderRadius: 16, border: 'none', boxShadow: SHADOW_CARD, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px 10px' }}>
        <Avatar name={post.name} square={post.authorType === 'company'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 13.5, color: INK }}>{post.name}</div>
          <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB }}>{post.role}</div>
        </div>
      </div>
      <div style={{ padding: '0 16px 12px', fontFamily: FONT_B, fontSize: 13.5, color: INK, lineHeight: 1.55 }}>{post.content}</div>
      {post.image && <img src={post.image} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />}
      {post.video && (
        <div style={{ width: '100%', height: 200, background: '#0B1220', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{JIcons.play}</div>
        </div>
      )}
      {(post.likes > 0 || post.recommended.length > 0) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px 0', fontFamily: FONT_B, fontSize: 11.5, color: SUB }}>
          <span>{post.likes > 0 ? `${post.likes} me gusta` : ''}</span>
          <span>{post.recommended.length > 0 ? `Recomendado por ${post.recommended.length}` : ''}</span>
        </div>
      )}
      <div style={{ display: 'flex', borderTop: `1px solid ${BORDER}`, marginTop: 10 }}>
        {[
          ['like', post.likedByMe ? JIcons.heart(true) : JIcons.heart(false), 'Me gusta', post.likedByMe],
          ['recommend', JIcons.thumbsUp(iRecommended), 'Recomendar', iRecommended],
          ['toggleComments', JIcons.comment, `Comentar${post.comments.length ? ` (${post.comments.length})` : ''}`, showComments],
        ].map(([action, icon, label, active]) => (
          <button key={action} onClick={() => action === 'toggleComments' ? setShowComments(s => !s) : onToggle(post.id, action)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer', color: active ? BLUE : SUB, fontFamily: FONT_B, fontWeight: 600, fontSize: 12.5 }}>
            {icon} {label}
          </button>
        ))}
      </div>
      {showComments && (
        <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${BORDER}` }}>
          {post.comments.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, marginBottom: 8 }}>
              <Avatar name={c.author} size={28} />
              <div style={{ background: BG, borderRadius: 12, padding: '7px 12px', flex: 1 }}>
                <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 11.5, color: INK }}>{c.author}</div>
                <div style={{ fontFamily: FONT_B, fontSize: 12.5, color: INK }}>{c.text}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="Escribí un comentario…"
              style={{ flex: 1, padding: '9px 14px', borderRadius: 999, border: 'none', boxShadow: SHADOW_CARD, outline: 'none', fontFamily: FONT_B, fontSize: 12.5 }} />
            <button onClick={addComment} style={{ padding: '9px 16px', borderRadius: 999, border: 'none', background: BLUE, color: '#fff', fontFamily: FONT_B, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedScreen({ posts, setPosts, myName, subtitle, isMobile, jobs, onOpenJob }) {
  const handleToggle = (id, action, payload) => {
    setPosts(list => list.map(p => {
      if (p.id !== id) return p;
      if (action === 'like') return { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) };
      if (action === 'recommend') {
        const has = p.recommended.includes(myName);
        return { ...p, recommended: has ? p.recommended.filter(n => n !== myName) : [...p.recommended, myName] };
      }
      if (action === 'comment') return { ...p, comments: [...p.comments, payload] };
      return p;
    }));
  };

  const handlePost = ({ content, image, video }) => {
    setPosts(list => [{ id: `p-${Date.now()}`, authorType: 'user', name: myName, role: 'Miembro de Key Jobs', content, image, video, likes: 0, likedByMe: false, comments: [], recommended: [] }, ...list]);
  };

  const feed = (
    <div style={{ maxWidth: 600, width: '100%', margin: isMobile ? 0 : '0 auto' }}>
      <Composer myName={myName} onPost={handlePost} />
      {posts.map(p => <PostCard key={p.id} post={p} myName={myName} onToggle={handleToggle} />)}
    </div>
  );

  if (isMobile) {
    return <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>{feed}</div>;
  }

  // Desktop: true LinkedIn 3-column feed — sticky profile card on the left,
  // the feed centered, and a "Jobs for you" suggestion rail on the right
  // that links straight into the Jobs tab (not just decorative).
  const suggestions = [...jobs].sort((a, b) => b.salaryMax - a.salaryMax).slice(0, 4);
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ display: 'flex', gap: 24, maxWidth: 1128, margin: '0 auto', alignItems: 'flex-start' }}>
        <div style={{ width: 225, flexShrink: 0, position: 'sticky', top: 24 }}>
          <div style={{ background: CARD, borderRadius: 16, border: 'none', boxShadow: SHADOW_CARD, padding: 20, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Avatar name={myName} size={56} /></div>
            <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 15, color: INK }}>{myName}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 12, color: SUB, marginTop: 4, lineHeight: 1.4 }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, maxWidth: 555 }}>{feed}</div>
        <div style={{ width: 300, flexShrink: 0, position: 'sticky', top: 24 }}>
          <div style={{ background: CARD, borderRadius: 16, border: 'none', boxShadow: SHADOW_CARD, padding: '16px 4px 8px' }}>
            <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 14, color: INK, padding: '0 16px 12px' }}>Empleos para vos</div>
            {suggestions.map(j => (
              <button key={j.id} onClick={() => onOpenJob(j.id)}
                style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px', background: 'none', border: 'none', borderTop: `1px solid ${BORDER}`, cursor: 'pointer', textAlign: 'left' }}>
                <Avatar name={j.company} size={36} square />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 12.5, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.title}</div>
                  <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB }}>{j.company} · {j.location}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Job detail ───────────────────────────────────────────────────────────────
function JobDetail({ job, applied, onApply, onBack }) {
  const salaryLabel = job.salaryMin === job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : `$${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`;
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard?.writeText(`${job.title} — ${job.company} · Key Jobs`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90, background: SKY_GRAD }}>
      <div style={{ padding: '18px 20px 46px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', border: 'none', color: INK, cursor: 'pointer' }}>
          {JIcons.chevronLeft}
        </button>
        <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 14, color: INK }}>Detalle del empleo</div>
        <div style={{ position: 'relative' }}>
          <button onClick={handleShare} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', border: 'none', color: INK, cursor: 'pointer' }}>
            {JIcons.share}
          </button>
          <AnimatePresence>
            {copied && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', top: 40, right: 0, background: INK, color: '#fff', fontFamily: FONT_B, fontSize: 11.5, fontWeight: 600, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                Enlace copiado
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ background: CARD, borderRadius: 22, boxShadow: SHADOW_CARD, padding: 20, marginTop: -30 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <Avatar name={job.company} size={52} square />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 17, color: INK }}>{job.title}</div>
              <div style={{ fontFamily: FONT_B, fontSize: 13, color: SUB, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {job.company} {job.keychainLinked && <span style={{ color: BLUE, display: 'flex', alignItems: 'center', gap: 3 }}>{JIcons.link} KEYCHAIN</span>} · {job.location}
              </div>
            </div>
          </div>
          <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 18, color: BLUE, marginBottom: 12 }}>{salaryLabel} <span style={{ fontSize: 12, fontWeight: 500, color: SUB }}>/{job.unit}</span></div>
          <div style={{ display: 'flex', gap: 18, padding: '12px 0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, marginBottom: 16 }}>
            {[[JIcons.clock, job.postedAgo], [JIcons.briefcase, job.commitment], [JIcons.pin, job.type]].map(([icon, label], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, color: SUB, fontFamily: FONT_B, fontSize: 11.5 }}>{icon} {label}</div>
            ))}
          </div>
          {job.linkedAsset && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 10, background: `${BLUE}0d`, color: BLUE_D, fontFamily: FONT_B, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
              {JIcons.link} Vinculado al activo tokenizado: {job.linkedAsset}
            </div>
          )}
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK, marginBottom: 10 }}>Habilidades y requisitos</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {job.tags.map(t => <Tag key={t}>{t}</Tag>)}
          </div>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK, marginBottom: 8 }}>Descripción del puesto</div>
          <div style={{ fontFamily: FONT_B, fontSize: 13, color: SUB, lineHeight: 1.6, marginBottom: 16 }}>{job.description}</div>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK, marginBottom: 8 }}>Responsabilidades clave</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {job.responsibilities.map((r, i) => <li key={i} style={{ fontFamily: FONT_B, fontSize: 13, color: SUB, lineHeight: 1.7 }}>{r}</li>)}
          </ul>
        </div>
        <div style={{ position: 'sticky', bottom: 0, background: `linear-gradient(180deg, transparent, ${BG} 30%)`, padding: '18px 0 0', marginTop: 16 }}>
          <button disabled={applied} onClick={onApply}
            style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: applied ? GREEN : BLUE_GRAD, boxShadow: applied ? 'none' : SHADOW_BLUE, color: '#fff', fontFamily: FONT_H, fontWeight: 800, fontSize: 15, cursor: applied ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {applied ? <>{JIcons.checkCircle} Postulación enviada</> : 'Postularme'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post-a-job form (company side) ───────────────────────────────────────────
function PostJobForm({ companyName, onCancel, onCreate }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [unit, setUnit] = useState('mes');
  const [type, setType] = useState('Presencial');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const canSubmit = title.trim() && description.trim() && salaryMin;

  const submit = () => {
    onCreate({
      id: `j-${Date.now()}`, company: companyName, keychainLinked: false, title: title.trim(), category: category.trim() || 'General',
      tags, salaryMin: Number(salaryMin) || 0, salaryMax: Number(salaryMax) || Number(salaryMin) || 0, unit, type,
      commitment: 'Tiempo completo', location: location.trim() || 'A convenir', postedAgo: 'recién', applicants: 0,
      description: description.trim(), responsibilities: [],
    });
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: INK, cursor: 'pointer', display: 'flex' }}>{JIcons.chevronLeft}</button>
        <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 17, color: INK }}>Publicar empleo</div>
      </div>

      {[
        ['Título del puesto', title, setTitle, 'Ej: Property Manager'],
        ['Categoría', category, setCategory, 'Ej: Gestión de Propiedades'],
        ['Ubicación', location, setLocation, 'Ej: CABA, Argentina'],
      ].map(([label, val, setter, ph]) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
          <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${BORDER}`, outline: 'none', fontFamily: FONT_B, fontSize: 13.5 }} />
        </div>
      ))}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Salario</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="Mín." type="number"
            style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${BORDER}`, outline: 'none', fontFamily: FONT_B, fontSize: 13.5 }} />
          <input value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="Máx." type="number"
            style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${BORDER}`, outline: 'none', fontFamily: FONT_B, fontSize: 13.5 }} />
        </div>
        <select value={unit} onChange={e => setUnit(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${BORDER}`, fontFamily: FONT_B, fontSize: 13, background: '#fff' }}>
          {['hora', 'mes', 'proyecto fijo'].map(u => <option key={u} value={u}>por {u}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Modalidad</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Presencial', 'Remoto', 'Híbrido'].map(t => (
            <button key={t} onClick={() => setType(t)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${type === t ? BLUE : BORDER}`, background: type === t ? `${BLUE}12` : '#fff', color: type === t ? BLUE : SUB, fontFamily: FONT_B, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Habilidades requeridas</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {tags.map(t => (
            <Tag key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              {t} <span onClick={() => setTags(tags.filter(x => x !== t))}>{JIcons.close}</span>
            </Tag>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Escribí una habilidad y presioná Enter" list="skills-list"
            style={{ flex: 1, boxSizing: 'border-box', padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${BORDER}`, outline: 'none', fontFamily: FONT_B, fontSize: 13 }} />
          <datalist id="skills-list">{SKILLS_POOL.map(s => <option key={s} value={s} />)}</datalist>
          <button onClick={addTag} style={{ padding: '0 16px', borderRadius: 12, border: 'none', background: TAG_BG, color: '#fff', fontFamily: FONT_B, fontWeight: 700, cursor: 'pointer' }}>+</button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Descripción</div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describí el puesto, el equipo y lo que buscás…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${BORDER}`, outline: 'none', fontFamily: FONT_B, fontSize: 13.5, resize: 'vertical' }} />
      </div>

      <button disabled={!canSubmit} onClick={submit}
        style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: canSubmit ? BLUE : BORDER, color: '#fff', fontFamily: FONT_H, fontWeight: 800, fontSize: 15, cursor: canSubmit ? 'pointer' : 'default' }}>
        Publicar anuncio
      </button>
    </div>
  );
}

// ─── Jobs screen (candidate: browse+apply · company: manage listings) ────────
function JobsScreen({ role, jobs, setJobs, appliedIds, setAppliedIds, companyName, isMobile, initialQuery, initialJobId }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [locationQuery, setLocationQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [typeFilter, setTypeFilter] = useState('Todas');
  // Desktop starts with the top job already open in the detail pane — the
  // same master-detail convention as Gmail/LinkedIn Jobs, so the right panel
  // is never just an empty prompt on first load. Mobile starts unselected
  // since there there's no split-pane to fill. A suggestion clicked from the
  // Home feed's right rail arrives here as initialJobId.
  const [selectedJob, setSelectedJob] = useState(isMobile ? null : (jobs.find(j => j.id === initialJobId) ?? jobs[0] ?? null));
  const [showForm, setShowForm] = useState(false);
  const [savedIds, setSavedIds] = useState([]);
  const toggleSaved = (id) => setSavedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

  if (role === 'company') {
    const myJobs = jobs.filter(j => j.company === companyName);
    const list = (
      <div style={{ flex: isMobile ? 1 : undefined, width: isMobile ? undefined : PANEL_WIDTH, flexShrink: 0, overflowY: 'auto', padding: '16px 16px 24px', borderRight: isMobile ? 'none' : `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 19, color: INK }}>Mis anuncios</div>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 999, border: 'none', background: BLUE, color: '#fff', fontFamily: FONT_B, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
            {JIcons.plus} Publicar
          </button>
        </div>
        {myJobs.length === 0 && <div style={{ textAlign: 'center', padding: '50px 0', color: SUB, fontFamily: FONT_B, fontSize: 13.5 }}>Todavía no publicaste ningún anuncio.</div>}
        {myJobs.map(j => (
          <div key={j.id} style={{ background: CARD, borderRadius: 14, border: 'none', boxShadow: SHADOW_CARD, padding: 16, marginBottom: 12 }}>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14.5, color: INK, marginBottom: 4 }}>{j.title}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 12, color: SUB, marginBottom: 10 }}>{j.location} · {j.type} · publicado {j.postedAgo}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: FONT_B, fontSize: 12.5, color: BLUE, fontWeight: 700 }}>{j.applicants} postulantes</span>
              <Tag style={{ background: `${GREEN}18`, color: GREEN }}>Activo</Tag>
            </div>
          </div>
        ))}
      </div>
    );

    if (isMobile) {
      return showForm
        ? <PostJobForm companyName={companyName} onCancel={() => setShowForm(false)} onCreate={job => { setJobs(js => [job, ...js]); setShowForm(false); }} />
        : list;
    }

    return (
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {list}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {showForm
            ? <PostJobForm companyName={companyName} onCancel={() => setShowForm(false)} onCreate={job => { setJobs(js => [job, ...js]); setShowForm(false); }} />
            : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: SUB }}>
                <div style={{ color: BORDER }}>{JIcons.briefcase}</div>
                <div style={{ fontFamily: FONT_B, fontSize: 13.5 }}>Elegí "Publicar" para crear un nuevo anuncio.</div>
              </div>
            )}
        </div>
      </div>
    );
  }

  const categories = ['Todas', ...new Set(jobs.map(j => j.category))];
  const types = ['Todas', ...new Set(jobs.map(j => j.type))];
  const filtered = jobs.filter(j =>
    (category === 'Todas' || j.category === category) &&
    (typeFilter === 'Todas' || j.type === typeFilter) &&
    (j.title.toLowerCase().includes(query.toLowerCase()) || j.company.toLowerCase().includes(query.toLowerCase())) &&
    j.location.toLowerCase().includes(locationQuery.toLowerCase())
  );
  const featured = (category === 'Todas' && typeFilter === 'Todas' && !query && !locationQuery)
    ? [...jobs].filter(j => j.keychainLinked).sort((a, b) => b.salaryMax - a.salaryMax)[0]
    : null;

  const renderJobCard = (j) => {
    const salaryLabel = j.salaryMin === j.salaryMax ? `$${j.salaryMax.toLocaleString()}` : `$${j.salaryMin.toLocaleString()}–${j.salaryMax.toLocaleString()}`;
    const applied = appliedIds.includes(j.id);
    const isSel = !isMobile && selectedJob?.id === j.id;
    return (
      <motion.div key={j.id} onClick={() => setSelectedJob(j)} whileHover={{ y: -2, boxShadow: '0 6px 18px rgba(15,23,42,0.1)' }} whileTap={{ scale: 0.995 }}
        style={{ background: isSel ? `${BLUE}0d` : CARD, borderRadius: 18, border: `1.5px solid ${isSel ? BLUE : BORDER}`, padding: 16, marginBottom: 12, cursor: 'pointer', boxShadow: SHADOW_CARD }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          <Avatar name={j.company} square />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, display: 'flex', alignItems: 'center', gap: 5 }}>
              {j.company} {j.keychainLinked && <span style={{ color: BLUE }}>{JIcons.link}</span>}
            </div>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14.5, color: INK, marginTop: 1 }}>{j.title}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); toggleSaved(j.id); }}
            style={{ color: savedIds.includes(j.id) ? BLUE : BORDER, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex' }}>
            {JIcons.bookmark(savedIds.includes(j.id))}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {j.tags.slice(0, 3).map(t => <Tag key={t}>{t}</Tag>)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 15, color: INK }}>{salaryLabel}<span style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, fontWeight: 500 }}> /{j.unit}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: SUB, fontFamily: FONT_B, fontSize: 11 }}>{JIcons.clock} {j.postedAgo}</div>
          </div>
          {applied
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: GREEN, fontFamily: FONT_B, fontWeight: 700, fontSize: 12 }}>{JIcons.checkCircle} Postulado</span>
            : <button onClick={e => { e.stopPropagation(); setSelectedJob(j); }} style={{ padding: '9px 16px', borderRadius: 999, border: 'none', background: BLUE, color: '#fff', fontFamily: FONT_H, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Aplicar</button>}
        </div>
      </motion.div>
    );
  };

  if (isMobile) {
    if (selectedJob) {
      return <JobDetail job={selectedJob} applied={appliedIds.includes(selectedJob.id)} onBack={() => setSelectedJob(null)}
        onApply={() => setAppliedIds(ids => [...ids, selectedJob.id])} />;
    }
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
        <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 19, color: INK, marginBottom: 14 }}>Empleos</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${BORDER}`, background: CARD, marginBottom: 12 }}>
          {JIcons.search}
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por puesto o empresa"
            style={{ flex: 1, border: 'none', outline: 'none', fontFamily: FONT_B, fontSize: 13.5 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ flexShrink: 0, padding: '8px 15px', borderRadius: 999, border: `1.5px solid ${category === c ? BLUE : BORDER}`, background: category === c ? BLUE : CARD, color: category === c ? '#fff' : SUB, fontFamily: FONT_B, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
              {c}
            </button>
          ))}
        </div>
        {featured && <FeaturedJobCard job={featured} onOpen={() => setSelectedJob(featured)} />}
        <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 700 }}>Lista de empleos</div>
        {filtered.map(renderJobCard)}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '50px 0', color: SUB, fontFamily: FONT_B, fontSize: 13.5 }}>No hay empleos que coincidan con la búsqueda.</div>}
      </div>
    );
  }

  // Desktop: true LinkedIn Jobs structure — a top search-bar row (título +
  // ubicación), then three panes below it: a filter sidebar, a narrow results
  // list, and a wide detail pane. This is a real structural difference from
  // the old simple two-panel split: LinkedIn's Jobs page always has that
  // distinct filters column and title/location search row up top.
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px', borderBottom: `1px solid ${BORDER}`, background: CARD }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${BORDER}`, flex: 1, maxWidth: 340 }}>
          {JIcons.search}
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Título del puesto o palabra clave"
            style={{ flex: 1, border: 'none', outline: 'none', fontFamily: FONT_B, fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${BORDER}`, flex: 1, maxWidth: 280 }}>
          {JIcons.pin}
          <input value={locationQuery} onChange={e => setLocationQuery(e.target.value)} placeholder="Ubicación"
            style={{ flex: 1, border: 'none', outline: 'none', fontFamily: FONT_B, fontSize: 13 }} />
        </div>
        <div style={{ fontFamily: FONT_B, fontSize: 12.5, color: SUB, marginLeft: 8 }}>{filtered.length} resultado{filtered.length === 1 ? '' : 's'}</div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 220, flexShrink: 0, overflowY: 'auto', padding: '20px 18px', borderRight: `1px solid ${BORDER}` }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 12.5, color: INK, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Categoría</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                style={{ textAlign: 'left', padding: '7px 10px', borderRadius: 8, border: 'none', background: category === c ? `${BLUE}12` : 'none', color: category === c ? BLUE : SUB, fontFamily: FONT_B, fontWeight: category === c ? 700 : 500, fontSize: 12.5, cursor: 'pointer' }}>
                {c}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 12.5, color: INK, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Modalidad</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {types.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                style={{ textAlign: 'left', padding: '7px 10px', borderRadius: 8, border: 'none', background: typeFilter === t ? `${BLUE}12` : 'none', color: typeFilter === t ? BLUE : SUB, fontFamily: FONT_B, fontWeight: typeFilter === t ? 700 : 500, fontSize: 12.5, cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: 380, flexShrink: 0, overflowY: 'auto', padding: '18px 16px', borderRight: `1px solid ${BORDER}` }}>
          {featured && <FeaturedJobCard job={featured} onOpen={() => setSelectedJob(featured)} />}
          {filtered.map(renderJobCard)}
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '50px 0', color: SUB, fontFamily: FONT_B, fontSize: 13.5 }}>No hay empleos que coincidan con la búsqueda.</div>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {selectedJob ? (
            <JobDetail job={selectedJob} applied={appliedIds.includes(selectedJob.id)} onBack={() => setSelectedJob(null)}
              onApply={() => setAppliedIds(ids => [...ids, selectedJob.id])} />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: SUB }}>
              <div style={{ color: BORDER }}>{JIcons.briefcase}</div>
              <div style={{ fontFamily: FONT_B, fontSize: 13.5 }}>Elegí un empleo de la lista para ver los detalles.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small "add item" modal used by the resume sections ─────────────────────
function AddModal({ title, fields, onCancel, onSave }) {
  const [values, setValues] = useState(Object.fromEntries(fields.map(f => [f.key, ''])));
  const canSave = fields.every(f => !f.required || values[f.key].trim());
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 24px' }}>
        <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 16, color: INK, marginBottom: 14 }}>{title}</div>
        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, marginBottom: 5 }}>{f.label}</div>
            <input value={values[f.key]} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder}
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: `1.5px solid ${BORDER}`, outline: 'none', fontFamily: FONT_B, fontSize: 13.5 }} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '13px', borderRadius: 12, border: `1.5px solid ${BORDER}`, background: 'none', color: SUB, fontFamily: FONT_B, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>Cancelar</button>
          <button disabled={!canSave} onClick={() => onSave(values)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: canSave ? BLUE : BORDER, color: '#fff', fontFamily: FONT_B, fontWeight: 700, fontSize: 13.5, cursor: canSave ? 'pointer' : 'default' }}>Guardar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Profile screen ───────────────────────────────────────────────────────────
function CandidateProfile({ profile, setProfile, onSwitchRole, onLogout, isMobile }) {
  const [modal, setModal] = useState(null); // null | 'exp' | 'edu'
  const [skillInput, setSkillInput] = useState('');

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !profile.skills.includes(s)) setProfile(p => ({ ...p, skills: [...p.skills, s] }));
    setSkillInput('');
  };

  // Real completeness meter for the desktop right-rail card — driven by
  // whether the sections below actually have content, not a fixed number.
  const completionItems = [
    ['Acerca de', !!profile.about.trim()],
    ['Experiencia', profile.experience.length > 0],
    ['Educación', profile.education.length > 0],
    ['Habilidades', profile.skills.length > 0],
  ];
  const completionPct = Math.round((completionItems.filter(([, done]) => done).length / completionItems.length) * 100);

  const mainCol = (
    <>
      <div style={{ maxWidth: isMobile ? undefined : 700, width: '100%', margin: isMobile ? 0 : undefined }}>
      <div style={{ background: `linear-gradient(135deg, ${BLUE}, ${BLUE_D})`, borderRadius: 18, padding: '22px 20px', color: '#fff', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_H, fontWeight: 800, fontSize: 22 }}>{initials(profile.name)}</div>
          <div>
            <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 19 }}>{profile.name}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 12.5, opacity: 0.9, marginTop: 2 }}>{profile.headline}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 11.5, opacity: 0.75, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>{JIcons.pin} {profile.location}</div>
          </div>
        </div>
      </div>

      <div style={{ background: CARD, borderRadius: 16, border: 'none', boxShadow: SHADOW_CARD, padding: 16, marginBottom: 14 }}>
        <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK, marginBottom: 8 }}>Acerca de</div>
        <div style={{ fontFamily: FONT_B, fontSize: 13, color: SUB, lineHeight: 1.6 }}>{profile.about}</div>
      </div>

      <div style={{ background: CARD, borderRadius: 16, border: 'none', boxShadow: SHADOW_CARD, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK, display: 'flex', alignItems: 'center', gap: 7 }}>{JIcons.briefcase} Experiencia</div>
          <button onClick={() => setModal('exp')} style={{ background: 'none', border: 'none', color: BLUE, cursor: 'pointer', display: 'flex' }}>{JIcons.plus}</button>
        </div>
        {profile.experience.map(e => (
          <div key={e.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 13.5, color: INK }}>{e.role}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 12.5, color: SUB }}>{e.company} · {e.period}</div>
            {e.desc && <div style={{ fontFamily: FONT_B, fontSize: 12.5, color: SUB, marginTop: 4 }}>{e.desc}</div>}
          </div>
        ))}
        {profile.experience.length === 0 && <div style={{ fontFamily: FONT_B, fontSize: 12.5, color: SUB }}>Sin experiencia cargada.</div>}
      </div>

      <div style={{ background: CARD, borderRadius: 16, border: 'none', boxShadow: SHADOW_CARD, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK, display: 'flex', alignItems: 'center', gap: 7 }}>{JIcons.grad} Educación</div>
          <button onClick={() => setModal('edu')} style={{ background: 'none', border: 'none', color: BLUE, cursor: 'pointer', display: 'flex' }}>{JIcons.plus}</button>
        </div>
        {profile.education.map(e => (
          <div key={e.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 13.5, color: INK }}>{e.degree}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 12.5, color: SUB }}>{e.school} · {e.period}</div>
          </div>
        ))}
        {profile.education.length === 0 && <div style={{ fontFamily: FONT_B, fontSize: 12.5, color: SUB }}>Sin educación cargada.</div>}
      </div>

      <div style={{ background: CARD, borderRadius: 16, border: 'none', boxShadow: SHADOW_CARD, padding: 16, marginBottom: 14 }}>
        <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK, marginBottom: 10 }}>Habilidades</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {profile.skills.map(s => (
            <Tag key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              {s} <span onClick={() => setProfile(p => ({ ...p, skills: p.skills.filter(x => x !== s) }))}>{JIcons.close}</span>
            </Tag>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill()} placeholder="Agregar habilidad" list="skills-list-profile"
            style={{ flex: 1, boxSizing: 'border-box', padding: '9px 13px', borderRadius: 10, border: `1.5px solid ${BORDER}`, outline: 'none', fontFamily: FONT_B, fontSize: 13 }} />
          <datalist id="skills-list-profile">{SKILLS_POOL.map(s => <option key={s} value={s} />)}</datalist>
          <button onClick={addSkill} style={{ padding: '0 16px', borderRadius: 10, border: 'none', background: TAG_BG, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>+</button>
        </div>
      </div>

      <div style={{ background: CARD, borderRadius: 16, border: 'none', boxShadow: SHADOW_CARD, padding: 16, marginBottom: 20 }}>
        <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK, marginBottom: 10 }}>Recomendaciones</div>
        {profile.recommendations.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <Avatar name={r.from} size={34} square />
            <div>
              <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 13, color: INK }}>{r.from}</div>
              <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, marginBottom: 3 }}>{r.relation}</div>
              <div style={{ fontFamily: FONT_B, fontSize: 12.5, color: INK, lineHeight: 1.5, fontStyle: 'italic' }}>"{r.text}"</div>
            </div>
          </div>
        ))}
        {profile.recommendations.length === 0 && <div style={{ fontFamily: FONT_B, fontSize: 12.5, color: SUB }}>Sin recomendaciones todavía.</div>}
      </div>

      <button onClick={onSwitchRole} style={{ width: '100%', padding: 13, borderRadius: 12, border: `1.5px solid ${BORDER}`, background: 'none', color: BLUE, fontFamily: FONT_B, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
        Cambiar a modo empresa
      </button>
      <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 12, border: `1.5px solid ${BORDER}`, background: 'none', color: RED, fontFamily: FONT_B, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        {JIcons.logout} Cerrar sesión
      </button>
      </div>

      {createPortal(
        <AnimatePresence>
          {modal === 'exp' && (
            <AddModal title="Agregar experiencia"
              fields={[{ key: 'role', label: 'Puesto', placeholder: 'Ej: Property Manager', required: true }, { key: 'company', label: 'Empresa', placeholder: 'Ej: PropChain', required: true }, { key: 'period', label: 'Período', placeholder: 'Ej: 2024 — Presente' }, { key: 'desc', label: 'Descripción', placeholder: 'Breve descripción del rol' }]}
              onCancel={() => setModal(null)}
              onSave={values => { setProfile(p => ({ ...p, experience: [{ id: `e-${Date.now()}`, ...values }, ...p.experience] })); setModal(null); }} />
          )}
          {modal === 'edu' && (
            <AddModal title="Agregar educación"
              fields={[{ key: 'degree', label: 'Título/Carrera', placeholder: 'Ej: Lic. en Administración', required: true }, { key: 'school', label: 'Institución', placeholder: 'Ej: UBA', required: true }, { key: 'period', label: 'Período', placeholder: 'Ej: 2018 — 2023' }]}
              onCancel={() => setModal(null)}
              onSave={values => { setProfile(p => ({ ...p, education: [{ id: `ed-${Date.now()}`, ...values }, ...p.education] })); setModal(null); }} />
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 30px' }}>
      {isMobile ? mainCol : (
        <div style={{ display: 'flex', gap: 24, maxWidth: 1000, margin: '0 auto', alignItems: 'flex-start' }}>
          {mainCol}
          <div style={{ width: 260, flexShrink: 0, position: 'sticky', top: 24 }}>
            <div style={{ background: CARD, borderRadius: 16, boxShadow: SHADOW_CARD, padding: 18 }}>
              <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 14, color: INK, marginBottom: 4 }}>Completá tu perfil</div>
              <div style={{ fontFamily: FONT_B, fontSize: 11.5, color: SUB, marginBottom: 12 }}>{completionPct}% completo</div>
              <div style={{ height: 6, borderRadius: 999, background: BORDER, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ height: '100%', width: `${completionPct}%`, background: BLUE_GRAD, borderRadius: 999 }} />
              </div>
              {completionItems.map(([label, done]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontFamily: FONT_B, fontSize: 12.5, color: done ? INK : SUB }}>
                  <span style={{ color: done ? GREEN : BORDER, display: 'flex' }}>{JIcons.checkCircle}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompanyProfile({ company, setCompany, onSwitchRole, onLogout, myJobsCount, isMobile }) {
  const mainCol = (
      <div style={{ maxWidth: isMobile ? undefined : 700, width: '100%' }}>
      <div style={{ background: `linear-gradient(135deg, ${INK}, #1E293B)`, borderRadius: 18, padding: '22px 20px', color: '#fff', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_H, fontWeight: 800, fontSize: 22 }}>{initials(company.name || '?')}</div>
          <div>
            <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 19 }}>{company.name || 'Sin nombre'}</div>
            <div style={{ fontFamily: FONT_B, fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>{company.industry || 'Industria no especificada'}</div>
          </div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.15)', fontFamily: FONT_B, fontSize: 12.5 }}>{myJobsCount} anuncio{myJobsCount === 1 ? '' : 's'} activo{myJobsCount === 1 ? '' : 's'}</div>
      </div>

      <div style={{ background: CARD, borderRadius: 16, border: 'none', boxShadow: SHADOW_CARD, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK }}>Vincular con empresa de KEYCHAIN</div>
          <button onClick={() => setCompany(c => ({ ...c, linked: !c.linked }))}
            style={{ width: 42, height: 24, borderRadius: 999, border: 'none', background: company.linked ? BLUE : BORDER, position: 'relative', cursor: 'pointer' }}>
            <span style={{ position: 'absolute', top: 2, left: company.linked ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
          </button>
        </div>
        {company.linked ? (
          <select value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value, industry: 'Tokenización de activos · KEYCHAIN' }))}
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: `1.5px solid ${BORDER}`, fontFamily: FONT_B, fontSize: 13.5, background: '#fff' }}>
            <option value="">Elegí tu empresa…</option>
            {KEYCHAIN_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <>
            <input value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} placeholder="Nombre de tu empresa"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: `1.5px solid ${BORDER}`, outline: 'none', fontFamily: FONT_B, fontSize: 13.5, marginBottom: 10 }} />
            <input value={company.industry} onChange={e => setCompany(c => ({ ...c, industry: e.target.value }))} placeholder="Industria"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: `1.5px solid ${BORDER}`, outline: 'none', fontFamily: FONT_B, fontSize: 13.5 }} />
          </>
        )}
      </div>

      <div style={{ background: CARD, borderRadius: 16, border: 'none', boxShadow: SHADOW_CARD, padding: 16, marginBottom: 20 }}>
        <div style={{ fontFamily: FONT_H, fontWeight: 700, fontSize: 14, color: INK, marginBottom: 8 }}>Acerca de la empresa</div>
        <textarea value={company.about} onChange={e => setCompany(c => ({ ...c, about: e.target.value }))} rows={3} placeholder="Contale a los candidatos sobre tu empresa…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: `1.5px solid ${BORDER}`, outline: 'none', fontFamily: FONT_B, fontSize: 13, resize: 'vertical' }} />
      </div>

      <button onClick={onSwitchRole} style={{ width: '100%', padding: 13, borderRadius: 12, border: `1.5px solid ${BORDER}`, background: 'none', color: BLUE, fontFamily: FONT_B, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
        Cambiar a modo candidato
      </button>
      <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 12, border: `1.5px solid ${BORDER}`, background: 'none', color: RED, fontFamily: FONT_B, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
        {JIcons.logout} Cerrar sesión
      </button>
      </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 30px' }}>
      {isMobile ? mainCol : (
        <div style={{ display: 'flex', gap: 24, maxWidth: 1000, margin: '0 auto', alignItems: 'flex-start' }}>
          {mainCol}
          <div style={{ width: 260, flexShrink: 0, position: 'sticky', top: 24 }}>
            <div style={{ background: CARD, borderRadius: 16, boxShadow: SHADOW_CARD, padding: 18 }}>
              <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 14, color: INK, marginBottom: 12 }}>Resumen</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${BORDER}`, fontFamily: FONT_B, fontSize: 12.5 }}>
                <span style={{ color: SUB }}>Anuncios activos</span><span style={{ color: INK, fontWeight: 700 }}>{myJobsCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${BORDER}`, fontFamily: FONT_B, fontSize: 12.5 }}>
                <span style={{ color: SUB }}>Vinculada a KEYCHAIN</span><span style={{ color: company.linked ? GREEN : SUB, fontWeight: 700 }}>{company.linked ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Role selection (first run) ───────────────────────────────────────────────
function RoleSelect({ onSelect }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 22px', background: SKY_GRAD }}>
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: FONT_H, fontWeight: 900, fontSize: 24, color: INK, marginBottom: 6 }}>¿Cómo querés usar Key Jobs?</div>
          <div style={{ fontFamily: FONT_B, fontSize: 13, color: SUB }}>Podés cambiarlo después desde tu perfil.</div>
        </div>
        {[
          ['candidate', JIcons.user, 'Busco empleo', 'Creá tu perfil, publicá y postulate a empleos.'],
          ['company', JIcons.building, 'Soy una empresa', 'Publicá anuncios y encontrá talento.'],
        ].map(([role, icon, title, desc]) => (
          <button key={role} onClick={() => onSelect(role)}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 18px', borderRadius: 20, border: 'none', background: CARD, boxShadow: SHADOW_CARD, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: BLUE_GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: SHADOW_BLUE }}>{icon}</div>
            <div>
              <div style={{ fontFamily: FONT_H, fontWeight: 800, fontSize: 15.5, color: INK }}>{title}</div>
              <div style={{ fontFamily: FONT_B, fontSize: 12.5, color: SUB, marginTop: 2 }}>{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ tab, setTab, role }) {
  const left = [['home', 'Inicio', JIcons.home], role === 'company' ? ['jobs', 'Anuncios', JIcons.briefcase] : ['jobs', 'Empleos', JIcons.briefcase]];
  const right = [role === 'company' ? ['profile', 'Empresa', JIcons.building] : ['profile', 'Perfil', JIcons.user]];
  const fabTarget = role === 'company' ? 'jobs' : 'home';
  const renderTab = ([id, label, icon]) => (
    <button key={id} onClick={() => setTab(id)}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', color: tab === id ? BLUE : SUB }}>
      {icon}
      <span style={{ fontFamily: FONT_B, fontSize: 10.5, fontWeight: tab === id ? 700 : 500 }}>{label}</span>
    </button>
  );
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', borderTop: `1px solid ${BORDER}`, background: CARD, padding: '8px 0 max(8px, env(safe-area-inset-bottom))' }}>
      {left.map(renderTab)}
      <div style={{ width: 60, flexShrink: 0 }} />
      {right.map(renderTab)}
      <button onClick={() => setTab(fabTarget)}
        style={{ position: 'absolute', left: '50%', top: -22, transform: 'translateX(-50%)', width: 52, height: 52, borderRadius: '50%', background: BLUE_GRAD, border: `4px solid ${CARD}`, boxShadow: SHADOW_BLUE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        {JIcons.plus}
      </button>
    </div>
  );
}

// ─── Desktop top nav — LinkedIn's convention: a search bar next to the logo,
// then icon-over-label nav items with a bottom-border active indicator ──────
function DesktopNav({ tab, setTab, role, onSearch }) {
  const [searchText, setSearchText] = useState('');
  const tabs = role === 'company'
    ? [['home', 'Inicio', JIcons.home], ['jobs', 'Anuncios', JIcons.briefcase], ['profile', 'Empresa', JIcons.building]]
    : [['home', 'Inicio', JIcons.home], ['jobs', 'Empleos', JIcons.briefcase], ['profile', 'Perfil', JIcons.user]];
  const submitSearch = () => { if (searchText.trim()) onSearch(searchText.trim()); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, justifyContent: 'flex-end' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: BG, width: 260, color: SUB }}>
        {JIcons.search}
        <input value={searchText} onChange={e => setSearchText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitSearch()}
          placeholder="Buscar empleos" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: FONT_B, fontSize: 13 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {tabs.map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 16px 8px', minWidth: 62, background: 'none', border: 'none', borderBottom: `2.5px solid ${tab === id ? INK : 'transparent'}`, color: tab === id ? INK : SUB, cursor: 'pointer' }}>
            {icon}
            <span style={{ fontFamily: FONT_B, fontSize: 10.5, fontWeight: tab === id ? 700 : 500 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Key Jobs is a standalone product (its own route, outside KEYCHAIN's
// login-gated Shell — see App.jsx PLATFORM_PATHS), same pattern as Bookey and
// Key Go: it owns its own login gate (useActiveAccount already reflects a
// wallet connected anywhere else in the app, since everything sits under the
// same root <ThirdwebProvider>) and its own role/tab navigation instead of
// relying on an external nav/routeData pair. Companies can either link one of
// KEYCHAIN's own tokenized-asset operators (pulling real job context like
// "Property Manager for a tokenized building") or run an independent listing.
export default function KeyJobs() {
  const account = useActiveAccount();
  const { disconnect } = useDisconnect();
  const routerNavigate = useNavigate();
  const isMobile = useMobile(DESKTOP_BP);
  const [role, setRole] = useState(null); // null | 'candidate' | 'company'
  const [tab, setTab] = useState('home');
  const [posts, setPosts] = useState(SEED_POSTS);
  const [jobs, setJobs] = useState(SEED_JOBS);
  const [appliedIds, setAppliedIds] = useState([]);
  const [profile, setProfile] = useState(SEED_PROFILE);
  const [company, setCompany] = useState({ name: '', industry: '', about: '', linked: false });
  // Lets the desktop top-nav search bar and the Home feed's "Empleos para
  // vos" rail jump straight into the Jobs tab pre-filtered/pre-selected,
  // instead of just switching tabs and leaving the user to search again.
  const [jobsQuery, setJobsQuery] = useState('');
  const [jumpJobId, setJumpJobId] = useState(null);
  const openJob = (id) => { setJumpJobId(id); setJobsQuery(''); setTab('jobs'); };
  const searchJobs = (text) => { setJobsQuery(text); setJumpJobId(null); setTab('jobs'); };

  if (!account) {
    return <KeyPayLogin onSuccess={() => {}} onBack={() => routerNavigate('/')} />;
  }

  if (!role) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px 10px' }}>
          <span style={{ fontFamily: FONT_H, fontWeight: 900, fontSize: 19, color: INK, letterSpacing: '-0.03em' }}>Key Jobs</span>
          <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999, background: `${BLUE}18`, color: BLUE, fontWeight: 700, fontFamily: FONT_B }}>by KEYCHAIN</span>
        </div>
        <RoleSelect onSelect={setRole} />
      </div>
    );
  }

  const myCompanyName = company.linked ? company.name : (company.name || 'Mi Empresa');
  const myJobsCount = jobs.filter(j => j.company === myCompanyName).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 18px 10px', background: CARD, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: FONT_H, fontWeight: 900, fontSize: 19, color: INK, letterSpacing: '-0.03em' }}>Key Jobs</span>
          <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999, background: `${BLUE}18`, color: BLUE, fontWeight: 700, fontFamily: FONT_B }}>by KEYCHAIN</span>
        </div>
        {!isMobile && <DesktopNav tab={tab} setTab={setTab} role={role} onSearch={searchJobs} />}
      </div>

      {tab === 'home' && (
        <FeedScreen posts={posts} setPosts={setPosts} myName={role === 'company' ? myCompanyName : profile.name}
          subtitle={role === 'company' ? (company.industry || 'Industria no especificada') : profile.headline} isMobile={isMobile}
          jobs={jobs} onOpenJob={openJob} />
      )}
      {tab === 'jobs' && (
        <JobsScreen role={role} jobs={jobs} setJobs={setJobs} appliedIds={appliedIds} setAppliedIds={setAppliedIds} companyName={myCompanyName} isMobile={isMobile}
          initialQuery={jobsQuery} initialJobId={jumpJobId} />
      )}
      {tab === 'profile' && role === 'candidate' && (
        <CandidateProfile profile={profile} setProfile={setProfile} onSwitchRole={() => { setRole('company'); setTab('home'); }} onLogout={() => disconnect()} isMobile={isMobile} />
      )}
      {tab === 'profile' && role === 'company' && (
        <CompanyProfile company={company} setCompany={setCompany} onSwitchRole={() => { setRole('candidate'); setTab('home'); }} onLogout={() => disconnect()} myJobsCount={myJobsCount} isMobile={isMobile} />
      )}

      {isMobile && <TabBar tab={tab} setTab={setTab} role={role} />}
    </div>
  );
}
