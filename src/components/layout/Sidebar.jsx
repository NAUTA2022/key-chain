import { useState, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PLogo } from '../ui';
import { Icons } from '../ui';

const Token3dIcon = (
  <img src="/3d.png" alt="Token" style={{ width: 18, height: 18, objectFit: 'contain', display: 'block' }} />
);

const HexIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
  </svg>
);

const EcoIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="12" cy="4"  r="1.8" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="20" cy="8"  r="1.8" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="20" cy="16" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="12" cy="20" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="4"  cy="16" r="1.8" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="4"  cy="8"  r="1.8" stroke="currentColor" strokeWidth="1.4"/>
    <line x1="12" y1="9.5"  x2="12" y2="5.8"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="13.8" y1="10.8" x2="18.4" y2="8.6"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="13.8" y1="13.2" x2="18.4" y2="15.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="12" y1="14.5" x2="12" y2="18.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="10.2" y1="13.2" x2="5.6" y2="15.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="10.2" y1="10.8" x2="5.6" y2="8.6"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const BookeyIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M3 12l9-9 9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const KeyDriveIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="1" y="13" width="22" height="7" rx="2" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M5 13V9a2 2 0 012-2h10a2 2 0 012 2v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="6" cy="20" r="1.5" fill="currentColor"/>
    <circle cx="18" cy="20" r="1.5" fill="currentColor"/>
  </svg>
);

const KeyJobsIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

const KeyRuralIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M4 20h16M5 20V9l4-3 4 3v11M13 20V6l4-3 4 3v14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EscrowIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrackerIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 3"/>
  </svg>
);

const SubsidiariesIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="8" width="7" height="13" rx="1" stroke="currentColor" strokeWidth="1.6"/>
    <rect x="14" y="3" width="7" height="18" rx="1" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M6 12h1M6 15h1M6 18h1M17 7h1M17 10h1M17 13h1M17 16h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

// The five standalone products KEYCHAIN operates outside the main
// login-gated app (same pattern as /bookey — see App.jsx PLATFORM_PATHS).
// Opened in a new tab since each is functionally a separate company/site.
const SUBSIDIARIES = [
  { id: 'bookey',  name: 'Bookey',       desc: 'Reservas de propiedades tokenizadas', icon: BookeyIcon,   path: '/bookey',       color: '#f59e0b' },
  { id: 'keydrive',name: 'Key Go',       desc: 'Viajes en autos tokenizados',          icon: KeyDriveIcon, path: '/key-drive',    color: '#3b82f6' },
  { id: 'keyjobs', name: 'Key Jobs',     desc: 'Empleos y talento tokenizado',        icon: KeyJobsIcon,  path: '/key-jobs',     color: '#2F6FED' },
  { id: 'keyrural',name: 'Key Rural',    desc: 'Campos y activos agropecuarios tokenizados', icon: KeyRuralIcon, path: '/key-rural', color: '#65a30d' },
  { id: 'escrow',  name: 'Escrow Chain', desc: 'Importaciones y exportaciones on-chain', icon: EscrowIcon, path: '/escrow-chain', color: '#22c55e' },
  { id: 'tracker', name: 'Tracker GPS',  desc: 'Seguimiento en tiempo real de activos', icon: TrackerIcon, path: '/tracker-gps',  color: '#a855f7' },
];

const investorItems = [
  { id: 'dashboard',    label: 'Inicio',             labelMobile: 'Inicio',        icon: Icons.dash      },
  { id: 'primario',     label: 'Tokenizaciones',     labelMobile: 'Tokens',        icon: HexIcon         },
  { id: 'secundario',   label: 'Mercado Secundario', labelMobile: 'Secundario',    icon: Icons.secondary },
  { id: 'token',        label: 'Token KYCN',         labelMobile: 'Token KYCN',    icon: Token3dIcon     },
  { id: 'pertenencias', label: 'Mis Pertenencias',   labelMobile: 'Pertenencias',  icon: Icons.wallet    },
  { id: 'ecosistema',   label: 'Ecosistema',         labelMobile: 'Ecosistema',    icon: EcoIcon         },
  { id: 'academia',     label: 'Academia',           labelMobile: 'Academia',      icon: Icons.academy   },
];

const adminItems = [
  { id: 'admin',        label: 'Panel Admin',        labelMobile: 'Admin',         icon: Icons.admin     },
  { id: 'primario',     label: 'Tokenizaciones',     labelMobile: 'Tokens',        icon: HexIcon         },
  { id: 'secundario',   label: 'Mercado Secundario', labelMobile: 'Secundario',    icon: Icons.secondary },
  { id: 'token',        label: 'Token KYCN',         labelMobile: 'Token KYCN',    icon: Icons.token     },
  { id: 'academia',     label: 'Academia',           labelMobile: 'Academia',      icon: Icons.academy   },
  { id: 'config',       label: 'Configuración',      labelMobile: 'Config',        icon: Icons.settings  },
];

const bottomItems = [
  { id: 'subsidiarias', label: 'Subsidiarias', icon: SubsidiariesIcon },
  { id: 'perfil',       label: 'Perfil',       icon: Icons.profile    },
  { id: 'ayuda',        label: 'Help Center',  icon: Icons.help       },
];

const LogoutIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Sizes the hover pill's label text against the icon/gap/chevron chrome that
// surrounds it (see the pill's paddingLeft/gap/paddingRight below), so short
// labels ("Inicio") get a snug pill instead of the longest label's width.
let measureCtx = null;
function measurePillWidth(label) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-h').trim() || 'sans-serif';
  measureCtx.font = `600 13.5px ${fontFamily}`;
  const textWidth = measureCtx.measureText(label).width;
  const chrome = 10 /* padL */ + 18 /* icon */ + 16 /* gap */ + 8 /* label-chevron gap */ + 11 /* chevron */ + 20 /* padR */;
  return Math.max(110, Math.round(chrome + textWidth));
}

const NavItem = memo(function NavItem({ item, active, collapsed, onClick }) {
  const [hovered, setHovered] = useState(false);
  const [pillTop, setPillTop] = useState(0);
  const [pillWidth, setPillWidth] = useState(200);
  const btnRef = useRef(null);

  const handleEnter = () => {
    if (collapsed && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPillTop(r.top + r.height / 2);
      setPillWidth(measurePillWidth(item.label));
    }
    setHovered(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onClick(item.id)}
        title={collapsed ? item.label : undefined}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 10,
          width: '100%',
          padding: collapsed ? '6px 0' : '6px 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'transparent',
          color: active ? 'var(--gl-nav-a)' : 'var(--gl-nav)',
          fontFamily: 'var(--font-b)', fontSize: 13.5,
          fontWeight: active ? 600 : 500,
          transition: 'color 0.2s',
          textAlign: 'left', position: 'relative',
        }}
      >
        {/* Active left indicator */}
        {active && !collapsed && (
          <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 2.5, borderRadius: 99, background: 'var(--accent)' }} />
        )}

        {/* Liquid glass icon */}
        <span className={`nav-icon-glass${active ? ' is-active' : ''}`}
          style={{ color: active ? 'var(--gl-nav-a)' : 'var(--gl-nav)' }}
        >
          {item.icon}
        </span>

        {!collapsed && (
          <span style={{ paddingLeft: collapsed ? 0 : 2 }}>{item.label}</span>
        )}
      </button>

      {/* Blob hover pill — only on desktop collapsed sidebar */}
      <AnimatePresence>
        {collapsed && hovered && (
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => { onClick(item.id); setHovered(false); }}
            style={{
              position: 'fixed', left: 8, top: pillTop - 21, height: 42,
              display: 'flex', alignItems: 'center',
              background: 'var(--gl-panel)',
              border: `1px solid ${active ? 'var(--gl-bd2)' : 'var(--gl-bd)'}`,
              overflow: 'hidden', zIndex: 500, cursor: 'pointer',
              pointerEvents: 'all',
              animation: 'navBlobExpand 0.44s cubic-bezier(.34,1.18,.64,1) forwards',
              '--pill-w': `${pillWidth}px`,
              transformOrigin: 'left center',
              paddingLeft: 10, paddingRight: 20, gap: 16, whiteSpace: 'nowrap',
              boxShadow: 'var(--sh-md)',
            }}
          >
            <span style={{ display: 'flex', flexShrink: 0, color: active ? 'var(--gl-nav-a)' : 'var(--gl-nav)' }}>{item.icon}</span>
            <span style={{
              fontFamily: 'var(--font-h)', fontWeight: 600, fontSize: 13.5,
              color: active ? 'var(--gl-nav-a)' : 'var(--gl-nav)',
              animation: 'navTextIn 0.44s ease forwards',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {item.label}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

// ── Subsidiaries modal ─────────────────────────────────────────────────
// Lists the standalone products KEYCHAIN runs outside the login-gated app
// (same pattern as /bookey — see App.jsx PLATFORM_PATHS). Each opens in a
// new tab since they're functionally separate companies/sites.
function SubsidiariesModal({ onClose }) {
  return (
    <motion.div
      key="subs-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <motion.div
        key="subs-panel"
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440, borderRadius: 24, padding: '28px 26px',
          background: 'var(--surface)', border: '1px solid var(--border-l)', boxShadow: 'var(--sh-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>Subsidiarias</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'var(--surface2)', color: 'var(--ter)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', marginBottom: 20 }}>Otros productos del ecosistema KEYCHAIN.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SUBSIDIARIES.map(s => (
            <button
              key={s.id}
              onClick={() => window.open(s.path, '_blank', 'noopener,noreferrer')}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16,
                background: 'var(--gl-bg)', border: '1px solid var(--gl-icon)', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.color}1f`, color: s.color }}>{s.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{s.desc}</div>
              </span>
              <span style={{ color: 'var(--ter)', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Drawer (mobile overlay) ───────────────────────────────────────────
function SidebarDrawer({ route, nav, role, onClose, onLogout }) {
  const items = role === 'admin' ? adminItems : investorItems;
  const [subsOpen, setSubsOpen] = useState(false);

  const handleNav = (id) => { nav(id); onClose(); };
  const handleBottomClick = (id) => {
    if (id === 'subsidiarias') { setSubsOpen(true); return; }
    handleNav(id);
  };

  return (
    <>
      <motion.div
        key="drawer-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', top: 56, left: 0, right: 0, bottom: 0, zIndex: 300, background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(2px)' }}
      />
      <motion.div
        key="drawer-panel"
        initial={{ x: -290 }} animate={{ x: 0 }} exit={{ x: -290 }}
        transition={{ type: 'spring', damping: 32, stiffness: 400 }}
        style={{
          position: 'fixed', top: 56, left: 0, height: 'calc(100vh - 56px)', width: 272,
          zIndex: 301, display: 'flex', flexDirection: 'column',
          background: 'var(--gl-panel)',
          backdropFilter: 'blur(12px) saturate(160%) brightness(1.02)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%) brightness(1.02)',
          borderRight: '1px solid var(--gl-bd)',
          padding: '18px 14px 16px', boxSizing: 'border-box', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px', marginBottom: 20 }}>
          <button onClick={() => handleNav('dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <PLogo size={14} />
          </button>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-l)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ter)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {items.map(i => i.divider ? (
            <div key={i.id} style={{ height:1, background:'var(--gl-div)', margin:'6px 4px' }} />
          ) : (
            <NavItem key={i.id} item={{ ...i, label: i.labelMobile || i.label }} active={route === i.id} collapsed={false} onClick={handleNav} />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 10 }}>
          {bottomItems.map(i => (
            <NavItem key={i.id} item={i} active={route === i.id} collapsed={false} onClick={handleBottomClick} />
          ))}
          {/* Logout */}
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '6px 10px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'rgba(255,100,100,0.65)',
              fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 500,
              transition: 'color 0.2s',
              marginTop: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,100,100,0.90)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,100,100,0.65)'}
          >
            <span style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {LogoutIcon}
            </span>
            Cerrar sesión
          </button>
        </div>
      </motion.div>

      {createPortal(
        <AnimatePresence>
          {subsOpen && <SubsidiariesModal onClose={() => setSubsOpen(false)} />}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// ── Desktop Sidebar ───────────────────────────────────────────────────
export default function Sidebar({ route, nav, role, theme, collapsed, setCollapsed, drawerMode, onClose, drawerOpen, onLogout }) {
  const items = role === 'admin' ? adminItems : investorItems;
  const logoIcon = theme === 'light' ? '/icono.png' : '/iconow.png';
  const logoFull = theme === 'light' ? '/logo-light.png' : '/logo-dark.png';
  const logoRef = useRef(null);
  const waveElRef = useRef(null);
  const rafRef = useRef(null);
  const [logoHovered, setLogoHovered] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const handleBottomClick = (id) => {
    if (id === 'subsidiarias') { setSubsOpen(true); return; }
    nav(id);
  };

  const handleLogoEnter = useCallback(() => {
    setLogoHovered(true);
    if (!logoRef.current || !waveElRef.current) return;
    const rect = logoRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const root = document.documentElement;
    root.style.setProperty('--lx', `${cx}px`);
    root.style.setProperty('--ly', `${cy}px`);
    root.style.setProperty('--wr', '0px');
    waveElRef.current.classList.add('active');

    const start = performance.now();
    const duration = 2200;
    const maxR = 1800;
    const ease = t => 1 - Math.pow(1 - t, 3); // cubic ease-out
    const tick = now => {
      const t = Math.min((now - start) / duration, 1);
      root.style.setProperty('--wr', `${ease(t) * maxR}px`);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleLogoLeave = useCallback(() => {
    setLogoHovered(false);
    cancelAnimationFrame(rafRef.current);
    const root = document.documentElement;
    const currentR = parseFloat(root.style.getPropertyValue('--wr') || '0');
    if (currentR <= 0) { if (waveElRef.current) waveElRef.current.classList.remove('active'); return; }
    const duration = 900;
    const ease = t => t * t; // ease-in (collapse)
    const start = performance.now();
    const tick = now => {
      const t = Math.min((now - start) / duration, 1);
      root.style.setProperty('--wr', `${currentR * (1 - ease(t))}px`);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        root.style.setProperty('--wr', '0px');
        if (waveElRef.current) waveElRef.current.classList.remove('active');
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  if (drawerMode) {
    return (
      <AnimatePresence>
        {drawerOpen && (
          <SidebarDrawer route={route} nav={nav} role={role} onClose={onClose} onLogout={onLogout} />
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      animate={{ width: collapsed ? 58 : 232 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed', left: 0, top: 0,
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: 'var(--gl-panel)',
        backdropFilter: 'blur(56px) saturate(180%) brightness(1.02)',
        WebkitBackdropFilter: 'blur(56px) saturate(180%) brightness(1.02)',
        borderRight: '1px solid var(--gl-bd)',
        padding: collapsed ? '22px 8px 16px' : '22px 14px 16px',
        boxSizing: 'border-box', overflow: 'visible',
        zIndex: 10,
      }}
    >
      {/* Logo + collapse */}
      <div style={{
        display: 'flex', alignItems: 'center',
        flexDirection: collapsed ? 'column' : 'row',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? 0 : '0 8px', marginBottom: 28, gap: collapsed ? 10 : 0,
      }}>
        {collapsed ? (
          <button
            ref={logoRef}
            onMouseEnter={handleLogoEnter}
            onMouseLeave={handleLogoLeave}
            onClick={() => nav('dashboard')} title="Inicio"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: 36, height: 36 }}
          >
            <img src={logoIcon} alt="Inicio" style={{ position: 'absolute', width: 36, height: 36, objectFit: 'contain', opacity: logoHovered ? 0 : 1, transition: 'opacity 0.5s ease' }} />
            <img src="/logoblue.png" alt="Inicio" style={{ position: 'absolute', width: 36, height: 36, objectFit: 'contain', opacity: logoHovered ? 1 : 0, transition: 'opacity 0.5s ease' }} />
          </button>
        ) : (
          <button
            ref={logoRef}
            onMouseEnter={handleLogoEnter}
            onMouseLeave={handleLogoLeave}
            onClick={() => nav('dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, position: 'relative', height: 42 }}
          >
            <img src={logoFull} alt="KEY CHAIN" style={{ height: 42, width: 'auto', objectFit: 'contain', opacity: logoHovered ? 0 : 1, transition: 'opacity 0.5s ease' }} />
            <img src="/logoblue.png" alt="KEY CHAIN" style={{ position: 'absolute', left: 0, top: 0, height: 42, width: 'auto', objectFit: 'contain', opacity: logoHovered ? 1 : 0, transition: 'opacity 0.5s ease' }} />
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir' : 'Colapsar'}
          style={{
            width: 26, height: 26, borderRadius: 8, border: '1px solid var(--border-l)',
            background: 'transparent', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--ter)', flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d={collapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {items.map(i => i.divider ? (
          <div key={i.id} style={{ height:1, background:'var(--gl-div)', margin:'6px 4px', borderRadius:999 }} />
        ) : (
          <NavItem key={i.id} item={i} active={route === i.id} collapsed={collapsed} onClick={nav} />
        ))}
      </div>

      {/* Bottom items + logout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {bottomItems.map(i => (
          <NavItem key={i.id} item={i} active={route === i.id} collapsed={collapsed} onClick={handleBottomClick} />
        ))}

        {/* Logout button */}
        <button
          onClick={onLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            width: '100%',
            padding: collapsed ? '6px 0' : '6px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,100,100,0.60)',
            fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 500,
            transition: 'color 0.2s', marginTop: 4,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,100,100,0.90)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,100,100,0.60)'}
        >
          <span style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {LogoutIcon}
          </span>
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>

      {createPortal(
        <div ref={waveElRef} className="dot-logo-wave" />,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {subsOpen && <SubsidiariesModal onClose={() => setSubsOpen(false)} />}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
