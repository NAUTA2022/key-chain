import { useMenuFilter } from '~/lib/demoMenu';
import { useState, useRef, memo, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PLogo } from '~/components/ui';
import { useHydrated } from '~/hooks/useHydrated';
import { pathFor, type NavFn, type RouteKey } from '~/lib/navigation';
import type { Role, Theme } from '~/lib/preferences';
import { Icons } from '~/components/ui';
import { useT } from '~/i18n/useT';
import { DRAWER_W } from './MenuToggle';

/** Id of a sidebar entry: a page key, or the "Subsidiarias" modal action. */
type SidebarItemId = RouteKey | 'subsidiarias';

/** `labelKey` (and `mobileKey`, the shorter drawer name): keys in the `common` dictionaries, translated at render. */
type SidebarNavItem<T extends SidebarItemId = SidebarItemId> = { id: T; labelKey: string; icon: ReactNode };

type MainNavItem = SidebarNavItem<RouteKey> & { mobileKey?: string; divider?: boolean };

/** `name` is a product name (not translated); `descKey` is the description's key in `common`. */
type Subsidiary = { id: string; name: string; descKey: string; icon: ReactNode; path: string; color: string };

const Token3dIcon = (
  <img src="/3d.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', display: 'block' }} />
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

// Standalone products Brikme operates outside the main login-gated app,
// opened in a new tab. Only Bookey is public; the others are admin-only
// previews (see app/routes.ts) and are listed only for admins.
const PUBLIC_SUBSIDIARIES: Subsidiary[] = [
  { id: 'bookey',  name: 'Bookey',       descKey: 'subsidiaries.bookey', icon: BookeyIcon,   path: '/bookey',       color: '#f59e0b' },
];
const PREVIEW_SUBSIDIARIES: Subsidiary[] = [
  { id: 'keydrive',name: 'Key Go',       descKey: 'subsidiaries.keydrive', icon: KeyDriveIcon, path: '/key-drive',    color: '#3b82f6' },
  { id: 'keyjobs', name: 'Key Jobs',     descKey: 'subsidiaries.keyjobs', icon: KeyJobsIcon,  path: '/key-jobs',     color: '#2F6FED' },
  { id: 'keyrural',name: 'Key Rural',    descKey: 'subsidiaries.keyrural', icon: KeyRuralIcon, path: '/key-rural', color: '#65a30d' },
  { id: 'escrow',  name: 'Escrow Chain', descKey: 'subsidiaries.escrow', icon: EscrowIcon, path: '/escrow-chain', color: '#22c55e' },
  { id: 'tracker', name: 'Tracker GPS',  descKey: 'subsidiaries.tracker', icon: TrackerIcon, path: '/tracker-gps',  color: '#a855f7' },
];

const investorItems: MainNavItem[] = [
  { id: 'feed', labelKey: 'nav.feed', mobileKey: 'nav.mobile.feed', icon: Icons.feed      },
  { id: 'dashboard', labelKey: 'nav.dashboard', mobileKey: 'nav.mobile.dashboard', icon: Icons.dash      },
  { id: 'primario', labelKey: 'nav.primario', mobileKey: 'nav.mobile.primario', icon: HexIcon         },
  { id: 'secundario', labelKey: 'nav.secundario', mobileKey: 'nav.mobile.secundario', icon: Icons.secondary },
  { id: 'token', labelKey: 'nav.token', mobileKey: 'nav.mobile.token', icon: Token3dIcon     },
  { id: 'pertenencias', labelKey: 'nav.pertenencias', mobileKey: 'nav.mobile.pertenencias', icon: Icons.wallet    },
  { id: 'ecosistema', labelKey: 'nav.ecosistema', mobileKey: 'nav.mobile.ecosistema', icon: EcoIcon         },
  { id: 'academia', labelKey: 'nav.academia', mobileKey: 'nav.mobile.academia', icon: Icons.academy   },
];

// Admins are investors too: they keep every investor entry plus the admin tools.
const adminItems: MainNavItem[] = [
  { id: 'feed', labelKey: 'nav.feed', mobileKey: 'nav.mobile.feed', icon: Icons.feed      },
  { id: 'dashboard', labelKey: 'nav.dashboard', mobileKey: 'nav.mobile.dashboard', icon: Icons.dash      },
  { id: 'admin', labelKey: 'nav.admin', mobileKey: 'nav.mobile.admin', icon: Icons.admin     },
  { id: 'primario', labelKey: 'nav.primario', mobileKey: 'nav.mobile.primario', icon: HexIcon         },
  { id: 'secundario', labelKey: 'nav.secundario', mobileKey: 'nav.mobile.secundario', icon: Icons.secondary },
  { id: 'token', labelKey: 'nav.token', mobileKey: 'nav.mobile.token', icon: Token3dIcon     },
  { id: 'pertenencias', labelKey: 'nav.pertenencias', mobileKey: 'nav.mobile.pertenencias', icon: Icons.wallet    },
  { id: 'ecosistema', labelKey: 'nav.ecosistema', mobileKey: 'nav.mobile.ecosistema', icon: EcoIcon         },
  { id: 'academia', labelKey: 'nav.academia', mobileKey: 'nav.mobile.academia', icon: Icons.academy   },
  { id: 'config', labelKey: 'nav.config', mobileKey: 'nav.mobile.config', icon: Icons.settings  },
];

const TokenizeIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    <path d="M12 8.5V15.5M8.5 12H15.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

const tokenizeItem: MainNavItem = { id: 'wizard', labelKey: 'nav.wizard', mobileKey: 'nav.mobile.wizard', icon: TokenizeIcon };

/** Main entries for a role; company accounts and admins (live mode only) also get "Tokenizar activo" after "Tokenizaciones". */
function mainItems(role: Role, canTokenize: boolean): MainNavItem[] {
  const items = role === 'admin' ? adminItems : investorItems;
  if (!canTokenize) return items;
  const at = items.findIndex(i => i.id === 'primario') + 1;
  return [...items.slice(0, at), tokenizeItem, ...items.slice(at)];
}

const bottomItems: SidebarNavItem[] = [
  { id: 'subsidiarias', labelKey: 'nav.subsidiarias', icon: SubsidiariesIcon },
  { id: 'perfil',       labelKey: 'nav.perfil',       icon: Icons.profile    },
  { id: 'ayuda',        labelKey: 'nav.ayuda',        icon: Icons.help       },
];

const LogoutIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const COLLAPSED_W = 58; // collapsed sidebar width (px)
const LABEL_GAP = 14;  // hover label distance from the sidebar edge

type NavItemProps<T extends SidebarItemId> = {
  item: SidebarNavItem<T>;
  /** Translated name of the entry. */
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: (id: T) => void;
};

// `memo` drops the generic signature, so it is restored with the cast below.
const NavItem = memo(function NavItem<T extends SidebarItemId>({ item, label, active, collapsed, onClick }: NavItemProps<T>) {
  const [hovered, setHovered] = useState(false);
  const [pillTop, setPillTop] = useState(0);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  // Real links for pages (crawlable, open-in-new-tab); a button for actions.
  const id: SidebarItemId = item.id;
  const href = id === 'subsidiarias' ? null : pathFor(id);

  const handleEnter = () => {
    const el = linkRef.current ?? btnRef.current;
    if (collapsed && el) {
      const r = el.getBoundingClientRect();
      setPillTop(r.top + r.height / 2);
    }
    setHovered(true);
  };

  // Collapsed sidebar: on hover the label appears beside it, text only (no box),
  // a fixed gap from the sidebar edge and centred on the icon.
  const labelStyle: CSSProperties = {
    position: 'fixed', insetInlineStart: COLLAPSED_W + LABEL_GAP, top: pillTop,
    zIndex: 500, pointerEvents: 'none', whiteSpace: 'nowrap',
    fontFamily: 'var(--font-h)', fontWeight: 600, fontSize: 13.5, letterSpacing: '-0.005em',
    color: active ? 'var(--accent-text)' : 'var(--gl-nav-a)',
  };

  // Shared by both renderings of the item (<a> for pages, <button> for actions).
  const tagProps = {
    'aria-current': active ? ('page' as const) : undefined,
    'aria-label': collapsed ? label : undefined,
    'data-guide': `nav-${id}`,
    onMouseEnter: handleEnter,
    onMouseLeave: () => setHovered(false),
    onClick: (e: MouseEvent<HTMLElement>) => { if (href) e.preventDefault(); onClick(item.id); },
    title: collapsed ? label : undefined,
    style: {
      textDecoration: 'none',
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
      textAlign: 'start', position: 'relative',
    } satisfies CSSProperties,
  };

  const content = (
    <>
      {/* Active left indicator */}
      {active && !collapsed && (
        <div style={{ position: 'absolute', insetInlineStart: 0, top: '20%', bottom: '20%', width: 2.5, borderRadius: 99, background: 'var(--accent)' }} />
      )}

      {/* The icon alone (no box); the page you are on is marked in the brand orange. */}
      <span className="nav-icon-bare" style={{ color: active ? 'var(--accent)' : 'var(--gl-nav)' }}>
        {item.icon}
      </span>

      {!collapsed && (
        <span style={{ paddingInlineStart: collapsed ? 0 : 2 }}>{label}</span>
      )}
    </>
  );

  return (
    <>
      {href ? (
        <a ref={linkRef} href={href} {...tagProps}>{content}</a>
      ) : (
        <button ref={btnRef} type="button" {...tagProps}>{content}</button>
      )}

      {/* Hover label beside the collapsed sidebar (desktop) */}
      <AnimatePresence>
        {collapsed && hovered && (
          <motion.span style={labelStyle} initial={{ opacity: 0, x: -6, y: '-50%' }} animate={{ opacity: 1, x: 0, y: '-50%' }} exit={{ opacity: 0, x: -4, y: '-50%' }} transition={{ duration: 0.18, ease: 'easeOut' }}>
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
}) as <T extends SidebarItemId>(props: NavItemProps<T>) => ReactNode;

// ── Subsidiaries modal ─────────────────────────────────────────────────
// Lists the standalone products Brikme runs outside the login-gated app
// (same pattern as /bookey — see app/routes.ts). Each opens in a
// new tab since they're functionally separate companies/sites.
type SubsidiariesModalProps = { onClose: () => void; isAdmin: boolean };

function SubsidiariesModal({ onClose, isAdmin }: SubsidiariesModalProps) {
  const { t } = useT('common');
  const items = isAdmin ? [...PUBLIC_SUBSIDIARIES, ...PREVIEW_SUBSIDIARIES] : PUBLIC_SUBSIDIARIES;
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
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>{t('nav.subsidiarias')}</div>
          <button onClick={onClose} aria-label={t('close')} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'var(--surface2)', color: 'var(--ter)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', marginBottom: 20 }}>{t('subsidiaries.intro')}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(s => (
            <button
              key={s.id}
              onClick={() => window.open(s.path, '_blank', 'noopener,noreferrer')}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16,
                background: 'var(--gl-bg)', border: '1px solid var(--gl-icon)', cursor: 'pointer', textAlign: 'start', width: '100%',
              }}
            >
              <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.color}1f`, color: s.color }}>{s.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{t(s.descKey)}</div>
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
type SidebarDrawerProps = {
  route: RouteKey;
  nav: NavFn;
  role: Role;
  canTokenize: boolean;
  onClose: () => void;
  onLogout: () => void;
};

function SidebarDrawer({ route, nav, role, canTokenize, onClose, onLogout }: SidebarDrawerProps) {
  const { t, dir } = useT('common');
  // The drawer slides in from the inline-start edge (right in Arabic).
  const hidden = (dir === 'rtl' ? 1 : -1) * (DRAWER_W + 20);
  const menu = useMenuFilter();
  const items = menu(mainItems(role, canTokenize));
  const [subsOpen, setSubsOpen] = useState(false);
  const hydrated = useHydrated();

  const handleNav = (id: RouteKey) => { nav(id); onClose(); };
  const handleBottomClick = (id: SidebarItemId) => {
    if (id === 'subsidiarias') { setSubsOpen(true); return; }
    handleNav(id);
  };

  return (
    <>
      <motion.div
        key="drawer-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(2px)' }}
      />
      <motion.div
        key="drawer-panel"
        initial={{ x: hidden }} animate={{ x: 0 }} exit={{ x: hidden }}
        transition={{ type: 'spring', damping: 32, stiffness: 400 }}
        style={{
          position: 'fixed', top: 0, insetInlineStart: 0, height: '100vh', width: DRAWER_W,
          zIndex: 301, display: 'flex', flexDirection: 'column',
          background: 'var(--gl-panel)',
          backdropFilter: 'blur(12px) saturate(160%) brightness(1.02)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%) brightness(1.02)',
          borderInlineEnd: '1px solid var(--gl-bd)',
          padding: '0 14px 16px', boxSizing: 'border-box', overflowY: 'auto',
        }}
      >
        {/* Header row lines up with the topbar; the menu button (MenuToggle)
            sits at its right edge as the close X. */}
        <div style={{ display: 'flex', alignItems: 'center', height: 56, padding: '0 2px', marginBottom: 14, flexShrink: 0 }}>
          <button onClick={() => handleNav('feed')} aria-label={t('nav.goFeed')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <PLogo size={14} />
          </button>
        </div>

        <nav aria-label={t('nav.main')} style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {items.map(i => i.divider ? (
            <div key={i.id} style={{ height:1, background:'var(--gl-div)', margin:'6px 4px' }} />
          ) : (
            <NavItem key={i.id} item={i} label={t(i.mobileKey ?? i.labelKey)} active={route === i.id} collapsed={false} onClick={handleNav} />
          ))}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 10 }}>
          {menu(bottomItems).map(i => (
            <NavItem key={i.id} item={i} label={t(i.labelKey)} active={route === i.id} collapsed={false} onClick={handleBottomClick} />
          ))}
          {/* Logout */}
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '6px 10px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--neg)',
              fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 500,
              transition: 'color 0.2s',
              marginTop: 4,
            }}
          >
            <span className="nav-icon-bare">
              {LogoutIcon}
            </span>
            {t('nav.logout')}
          </button>
        </div>
      </motion.div>

      {hydrated && createPortal(
        <AnimatePresence>
          {subsOpen && <SubsidiariesModal isAdmin={role === 'admin'} onClose={() => setSubsOpen(false)} />}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// ── Desktop Sidebar ───────────────────────────────────────────────────
type SidebarBaseProps = {
  route: RouteKey;
  nav: NavFn;
  role: Role;
  /** Live company accounts and admins: shows "Tokenizar activo". */
  canTokenize?: boolean;
  theme: Theme;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onLogout: () => void;
};

// The drawer (mobile) variant needs `onClose`; the desktop one ignores it.
type SidebarProps = SidebarBaseProps & (
  | { drawerMode?: false; drawerOpen?: boolean; onClose?: () => void }
  | { drawerMode: true; drawerOpen?: boolean; onClose: () => void }
);

export default function Sidebar({ route, nav, role, canTokenize = false, theme, collapsed, setCollapsed, drawerMode, onClose, drawerOpen, onLogout }: SidebarProps) {
  const { t } = useT('common');
  const menu = useMenuFilter();
  const items = menu(mainItems(role, canTokenize));
  const logoIcon = theme === 'light' ? '/icono.png' : '/iconow.png';
  const logoFull = theme === 'light' ? '/logo-light.png' : '/logo-dark.png';
  const [subsOpen, setSubsOpen] = useState(false);
  const hydrated = useHydrated();
  const handleBottomClick = (id: SidebarItemId) => {
    if (id === 'subsidiarias') { setSubsOpen(true); return; }
    nav(id);
  };

  if (drawerMode) {
    return (
      <AnimatePresence>
        {drawerOpen && (
          <SidebarDrawer route={route} nav={nav} role={role} canTokenize={canTokenize} onClose={onClose} onLogout={onLogout} />
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      animate={{ width: collapsed ? COLLAPSED_W : 232 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed', insetInlineStart: 0, top: 0,
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: 'var(--gl-panel)',
        backdropFilter: 'blur(56px) saturate(180%) brightness(1.02)',
        WebkitBackdropFilter: 'blur(56px) saturate(180%) brightness(1.02)',
        borderInlineEnd: '1px solid var(--gl-bd)',
        padding: collapsed ? '22px 8px 16px' : '22px 14px 16px',
        boxSizing: 'border-box', overflow: 'visible',
        zIndex: 10,
      }}
    >
      {/* Logo + collapse (the logo is static: no hover swap, no background wave) */}
      <div style={{
        display: 'flex', alignItems: 'center',
        flexDirection: collapsed ? 'column' : 'row',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? 0 : '0 8px', marginBottom: 28, gap: collapsed ? 10 : 0,
      }}>
        {collapsed ? (
          <button
            onClick={() => nav('feed')} title={t('nav.feed')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36 }}
          >
            <img src={logoIcon} alt={t('nav.home')} style={{ width: 36, height: 36, objectFit: 'contain' }} />
          </button>
        ) : (
          <button
            onClick={() => nav('feed')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, height: 42 }}
          >
            <img src={logoFull} alt="Brikme" style={{ height: 42, width: 'auto', objectFit: 'contain' }} />
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? t('nav.expand') : t('nav.collapse')}
          aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
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

      {/* Scrolls when the window is shorter than the menu (the admin menu is long). It spans the
          sidebar's full width so icon glows are not clipped; hover pills are position: fixed and
          belong to the sidebar, so this box never clips them. */}
      <div className="kc-sidebar-scroll" style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        overflowY: 'auto', overflowX: 'hidden',
        margin: collapsed ? '0 -8px' : '0 -14px', padding: collapsed ? '0 8px' : '0 14px',
      }}>
      {/* Nav items */}
      <nav aria-label={t('nav.main')} style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {items.map(i => i.divider ? (
          <div key={i.id} style={{ height:1, background:'var(--gl-div)', margin:'6px 4px', borderRadius:999 }} />
        ) : (
          <NavItem key={i.id} item={i} label={t(i.labelKey)} active={route === i.id} collapsed={collapsed} onClick={nav} />
        ))}
      </nav>

      {/* Bottom items + logout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {menu(bottomItems).map(i => (
          <NavItem key={i.id} item={i} label={t(i.labelKey)} active={route === i.id} collapsed={collapsed} onClick={handleBottomClick} />
        ))}

        {/* Logout button */}
        <button
          onClick={onLogout}
          title={collapsed ? t('nav.logout') : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            width: '100%',
            padding: collapsed ? '6px 0' : '6px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--neg)',
            fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 500,
            transition: 'color 0.2s', marginTop: 4,
          }}
        >
          <span className="nav-icon-bare">
            {LogoutIcon}
          </span>
          {!collapsed && t('nav.logout')}
        </button>
      </div>
      </div>

      {hydrated && createPortal(
        <AnimatePresence>
          {subsOpen && <SubsidiariesModal isAdmin={role === 'admin'} onClose={() => setSubsOpen(false)} />}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
