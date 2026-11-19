import { useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { PDiv, Icons } from '~/components/ui';
import { NOTIFICATIONS } from '~/data';
import NotificationsPanel, { type PanelItem } from '~/features/notifications/NotificationsPanel';
import { timeAgo } from '~/features/notifications/time';
import { useNotifications } from '~/features/notifications/useNotifications';
import { MobileSearch, SearchBox } from '~/features/search/Search';
import type { NavFn } from '~/lib/navigation';
import { usePreferences, type FontPreset, type Palette, type Prefs, type PrefsUpdater, type Theme } from '~/lib/preferences';
import { useSession } from '~/lib/session';
import { isInternalPath } from '~/lib/links';
import { WalletPill } from '~/components/layout/WalletPill';

type FontOption = { id: FontPreset; label: string; sub: string; h: string; b: string };
type PaletteOption = { id: Palette; label: string; swatch: string };

const FONT_OPTIONS: FontOption[] = [
  { id: 'moderna',    label: 'Moderna',    sub: 'DM Sans + Inter',          h: '"DM Sans", sans-serif',       b: '"Inter", sans-serif' },
  { id: 'geometrica', label: 'Geométrica', sub: 'Space Grotesk + IBM Plex', h: '"Space Grotesk", sans-serif', b: '"IBM Plex Sans", sans-serif' },
  { id: 'humanista',  label: 'Humanista',  sub: 'Manrope',                  h: '"Manrope", sans-serif',       b: '"Manrope", sans-serif' },
  { id: 'tech',       label: 'Tech',       sub: 'Sora + Inter',             h: '"Sora", sans-serif',          b: '"Inter", sans-serif' },
];
const PALETTE_OPTIONS: PaletteOption[] = [
  { id: 'la33',   label: 'La 33',  swatch: 'linear-gradient(135deg,#F3B200 50%,#FF2D2D 50%)' },
  { id: 'verde',  label: 'Verde',  swatch: 'oklch(0.72 0.20 145)' },
  { id: 'rojo',   label: 'Rojo',   swatch: 'oklch(0.58 0.20 27)'  },
  { id: 'azul',   label: 'Azul',   swatch: 'oklch(0.55 0.18 255)' },
  { id: 'marron', label: 'Marrón', swatch: 'oklch(0.50 0.10 55)'  },
  { id: 'mono',   label: 'B / N',  swatch: 'linear-gradient(135deg,#16181d 50%,#fff 50%)' },
];
const RWA_CATS = ['Todos', 'Autos', 'Campos', 'Drones', 'Inmuebles', 'Edificios'];

const HAMBURGER_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <line x1="3" y1="6"  x2="21" y2="6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Demo notifications (no backend): today's static list, unchanged.
const DEMO_ITEMS: PanelItem[] = NOTIFICATIONS.map(n => ({ id: n.id, title: n.title, desc: n.desc, time: n.time, unread: n.unread }));

type PersonalizePanelProps = {
  open: boolean;
  onClose: () => void;
  prefs: Prefs;
  setPrefs: (u: PrefsUpdater) => void;
};

function PersonalizePanel({ open, onClose, prefs, setPrefs }: PersonalizePanelProps) {
  if (!open) return null;
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs(p => ({ ...p, [k]: v }));
  const sl: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 };
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'absolute', top: 52, right: 0, width: 340, zIndex: 95,
          background: 'var(--gl-panel)', backdropFilter: 'blur(12px) saturate(160%) brightness(1.02)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%) brightness(1.02)',
          borderRadius: 18, boxShadow: 'var(--sh-lg)',
          border: '1px solid var(--gl-bd)', overflow: 'hidden',
          maxWidth: 'calc(100vw - 24px)',
        }}
      >
        <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Personalización</span>
          <button onClick={() => setPrefs({ rubro: 'Todos', font: 'moderna', palette: 'la33' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>Restablecer</button>
        </div>
        <PDiv />
        <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 500, overflowY: 'auto' }}>
          <div>
            <div style={sl}>Rubro</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {RWA_CATS.map(c => (
                <button key={c} onClick={() => set('rubro', c)} style={{
                  padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                  border: prefs.rubro === c ? '1.5px solid transparent' : '1.5px solid var(--border)',
                  background: prefs.rubro === c ? 'var(--text)' : 'transparent',
                  color: prefs.rubro === c ? 'var(--bg)' : 'var(--sec)',
                  fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 500,
                }}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={sl}>Tipografía</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {FONT_OPTIONS.map(f => (
                <button key={f.id} onClick={() => set('font', f.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 13,
                  border: `1.5px solid ${prefs.font === f.id ? 'var(--accent)' : 'var(--border-l)'}`,
                  background: prefs.font === f.id ? 'var(--accent-bg)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                }}>
                  <span style={{ fontFamily: f.h, fontWeight: 800, fontSize: 22, color: 'var(--text)', width: 36, flexShrink: 0 }}>Ag</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontFamily: f.h, fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{f.label}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 1 }}>{f.sub}</span>
                  </span>
                  {prefs.font === f.id && <span style={{ color: 'var(--accent-text)', display: 'flex' }}>{Icons.check}</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={sl}>Paleta de colores</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {PALETTE_OPTIONS.map(p => (
                <button key={p.id} onClick={() => set('palette', p.id)} title={p.label} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '10px 4px', borderRadius: 13, cursor: 'pointer',
                  border: `1.5px solid ${prefs.palette === p.id ? 'var(--accent)' : 'var(--border-l)'}`,
                  background: prefs.palette === p.id ? 'var(--accent-bg)' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: p.swatch, border: '1px solid var(--border)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-b)', fontSize: 10.5, fontWeight: 600, color: prefs.palette === p.id ? 'var(--text)' : 'var(--ter)' }}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

type TopbarProps = {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  nav: NavFn;
  prefs: Prefs;
  setPrefs: (u: PrefsUpdater) => void;
  sidebarCollapsed?: boolean;
  isMobile?: boolean;
  /** Mobile: renders a plain hamburger. Without it, the shell's MenuToggle sits on top of a placeholder. */
  onMenuOpen?: () => void;
  onLogout?: () => void;
};

export default function Topbar({ theme, setTheme, nav, prefs, setPrefs, sidebarCollapsed, isMobile, onMenuOpen, onLogout }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [persOpen, setPersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const session = useSession();
  const { role: demoRole } = usePreferences();
  const live = session.status !== 'disabled';
  const isAdmin = live ? session.user?.role === 'admin' : demoRole === 'admin';
  const notif = useNotifications();
  const unread = live ? notif.unread : NOTIFICATIONS.filter(n => n.unread).length;
  const badge = unread > 99 ? '99+' : unread;

  const toggleNotif = () => {
    if (!notifOpen) notif.reload();
    setNotifOpen(o => !o);
  };

  const liveItems: PanelItem[] = notif.items.map(n => ({
    id: n.id, title: n.title, desc: n.body, time: timeAgo(n.createdAt, notif.fetchedAt), unread: n.unread, type: n.type,
    onSelect: () => {
      setNotifOpen(false);
      void notif.markRead(n.id);
      // Only same-site paths coming from the API are followed.
      if (n.link && isInternalPath(n.link)) navigate(n.link);
    },
  }));

  const notifPanel = (mobile: boolean) => live ? (
    <NotificationsPanel
      mobile={mobile} live
      onClose={() => setNotifOpen(false)}
      items={liveItems}
      onMarkAll={unread > 0 ? () => void notif.markAllRead() : undefined}
      loading={notif.enabled && !notif.loaded}
      emptyText={notif.enabled ? 'No tenés notificaciones por ahora.' : 'Iniciá sesión para ver tus notificaciones.'}
    />
  ) : (
    <NotificationsPanel mobile={mobile} onClose={() => setNotifOpen(false)} items={DEMO_ITEMS} />
  );

  // ── Mobile topbar ──────────────────────────────────────────────────
  if (isMobile) {
    const closeAll = () => { setMoreOpen(false); setPersOpen(false); setNotifOpen(false); };

    return (
      <div className="navbar-glow" style={{
        height: 56, flexShrink: 0, display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 6, background: 'var(--gl-panel)',
        backdropFilter: 'blur(56px) saturate(200%) brightness(1.04)',
        WebkitBackdropFilter: 'blur(56px) saturate(200%) brightness(1.04)',
        borderBottom: '1px solid var(--gl-bd)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Hamburger: placeholder — the real button (MenuToggle) is rendered by
            the shell above the drawer so it can morph into the close X. */}
        {onMenuOpen ? (
          <button onClick={onMenuOpen} aria-label="Abrir menú" style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--border-l)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sec)', flexShrink: 0 }}>
            {HAMBURGER_ICON}
          </button>
        ) : <div style={{ width: 36, height: 36, flexShrink: 0 }} />}

        {/* Buscar — abre la búsqueda a pantalla completa */}
        <MobileSearch isAdmin={isAdmin} />

        {/* Logo centered — link a inicio */}
        <button onClick={() => nav('feed')} aria-label="Ir al feed" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <img src={theme === 'dark' ? '/iconow.png' : '/icono.png'} alt="La 33" style={{ height: 34, width: 'auto', objectFit: 'contain', display: 'block' }} />
        </button>

        <div style={{ flex: 1 }} />

        {/* Cambiar tema — sin recuadro */}
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} aria-label="Cambiar tema claro u oscuro" style={{ width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sec)', flexShrink: 0 }}>
          {theme === 'light' ? Icons.moon : Icons.sun}
        </button>

        {/* Notificaciones — sin recuadro */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { toggleNotif(); setMoreOpen(false); setPersOpen(false); }} aria-label={unread > 0 ? `${unread} notificaciones sin leer` : 'Notificaciones'} aria-expanded={notifOpen} style={{ width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sec)', position: 'relative', flexShrink: 0 }}>
            {Icons.bell}
            {unread > 0 && <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 999, background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid var(--surface)' }}>{badge}</span>}
          </button>
          <AnimatePresence>{notifOpen && notifPanel(true)}</AnimatePresence>
        </div>

        {/* Más */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setMoreOpen(o => !o); setNotifOpen(false); setPersOpen(false); }} aria-label="Más opciones" aria-expanded={moreOpen} style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${moreOpen ? 'var(--accent)' : 'var(--border-l)'}`, background: moreOpen ? 'var(--surface2)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: moreOpen ? 'var(--accent)' : 'var(--sec)', flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>
          </button>
          <AnimatePresence>
            {moreOpen && (
              <>
                <div onClick={closeAll} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  style={{ position: 'absolute', top: 44, right: 0, width: 200, zIndex: 95, background: 'var(--gl-panel)', backdropFilter: 'blur(12px) saturate(150%)', WebkitBackdropFilter: 'blur(12px) saturate(150%)', borderRadius: 16, border: '1px solid var(--gl-bd)', boxShadow: 'var(--sh-lg)', overflow: 'hidden', padding: '6px 0' }}>
                  {/* Personalizar */}
                  <button onClick={() => { setPersOpen(true); setMoreOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 500 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="9" cy="7" r="2.6" fill="var(--surface)" stroke="currentColor" strokeWidth="1.7"/><circle cx="15" cy="17" r="2.6" fill="var(--surface)" stroke="currentColor" strokeWidth="1.7"/></svg>
                    Personalizar
                  </button>
                  {/* Configuración (solo administradores) */}
                  {isAdmin && <button onClick={() => { nav('config'); closeAll(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 500 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.7"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.7"/></svg>
                    Configuración
                  </button>}
                  <div style={{ height: 1, background: 'var(--border-l)', margin: '4px 12px' }} />
                  {/* Cerrar sesión */}
                  <button onClick={() => { closeAll(); onLogout?.(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,80,80,0.8)', fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 500 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Cerrar sesión
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          <AnimatePresence>{persOpen && <PersonalizePanel open={persOpen} onClose={() => setPersOpen(false)} prefs={prefs} setPrefs={setPrefs} />}</AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Desktop topbar ─────────────────────────────────────────────────
  return (
    <div className="navbar-glow" style={{
      position: 'fixed', top: 0,
      left: sidebarCollapsed ? 58 : 232, right: 0,
      transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1)',
      height: 64, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 24px',
      background: 'var(--gl-panel)',
      backdropFilter: 'blur(56px) saturate(200%) brightness(1.02)',
      WebkitBackdropFilter: 'blur(56px) saturate(200%) brightness(1.02)',
      borderBottom: '1px solid var(--gl-bd)', zIndex: 9,
    }}>

      {/* Search */}
      <SearchBox isAdmin={isAdmin} />

      <div style={{ flex: 1 }} />

      {/* Theme */}
      <button type="button" className="tb-btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Cambiar tema" aria-label="Cambiar tema claro u oscuro">
        {theme === 'light' ? Icons.moon : Icons.sun}
      </button>

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button type="button" onClick={toggleNotif} aria-label={unread > 0 ? `${unread} notificaciones sin leer` : 'Notificaciones'} aria-expanded={notifOpen}
          className={`tb-btn${notifOpen ? ' is-active' : ''}`}>
          {Icons.bell}
          {unread > 0 && <span className="tb-badge">{badge}</span>}
        </button>
        <AnimatePresence>
          {notifOpen && notifPanel(false)}
        </AnimatePresence>
      </div>

      {/* Wallet: avatar, address and USDC balance */}
      <div data-guide="topbar-wallet" style={{ display: 'flex' }}>
        <WalletPill nav={nav} />
      </div>
    </div>
  );
}
