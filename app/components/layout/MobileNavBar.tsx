import { useMenuFilter } from '~/lib/demoMenu';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Icons } from '~/components/ui';
import { useT } from '~/i18n/useT';
import { pathFor, type NavFn, type RouteKey } from '~/lib/navigation';
import type { Role } from '~/lib/preferences';

/** `labelKey`: key of the tab's name in the `common` dictionaries. */
type MobileTab = { id: RouteKey; labelKey: string; icon: ReactNode };

type MobileNavBarProps = {
  nav: NavFn;
  route: RouteKey;
  role: Role;
  /** Passed by the shell; currently unused by this component. */
  onMore?: () => void;
};

const HexIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
  </svg>
);

const ProfileIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

const INVESTOR_TABS: MobileTab[] = [
  { id: 'feed',         labelKey: 'mobileNav.feed',         icon: Icons.feed  },
  { id: 'dashboard',    labelKey: 'mobileNav.dashboard',    icon: Icons.dash  },
  { id: 'primario',     labelKey: 'mobileNav.primario',     icon: HexIcon     },
  { id: 'pertenencias', labelKey: 'mobileNav.pertenencias', icon: Icons.wallet},
  { id: 'perfil',       labelKey: 'mobileNav.perfil',       icon: ProfileIcon },
];

// Admins are investors too: every investor tab plus the admin panel (icon-only tabs leave room for six).
const ADMIN_TABS: MobileTab[] = [
  ...INVESTOR_TABS.slice(0, -1),
  { id: 'admin',        labelKey: 'mobileNav.admin',        icon: Icons.admin },
  ...INVESTOR_TABS.slice(-1),
];

export default function MobileNavBar({ nav, route, role }: MobileNavBarProps) {
  const { t } = useT('common');
  const menu = useMenuFilter();
  const tabs = menu(role === 'admin' ? ADMIN_TABS : INVESTOR_TABS);

  return (
    <nav aria-label={t('mobileNav.label')} style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'var(--gl-panel)',
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      borderTop: '1px solid var(--gl-bd)',
      display: 'flex', height: 68,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(tab => {
        const label = t(tab.labelKey);
        const active = route === tab.id;
        return (
          <motion.a
            key={tab.id}
            href={pathFor(tab.id)}
            aria-current={active ? 'page' : undefined}
            aria-label={label} title={label}
            data-guide={`mnav-${tab.id}`}
            onClick={(e) => { e.preventDefault(); nav(tab.id); }}
            whileTap={{ scale: 0.82 }}
            style={{
              textDecoration: 'none',
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: active ? 'var(--accent)' : 'var(--ter)', padding: 0,
              position: 'relative',
            }}
          >
            {active && (
              <motion.div
                layoutId="mobile-tab-indicator"
                // Centered with auto margins, not translateX(-50%): the
                // layoutId animation drives `transform` itself and would drop it.
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, margin: '0 auto',
                  width: 28, height: 2, borderRadius: 99, background: 'var(--accent)',
                }}
              />
            )}
            <span className="mnav-ico" style={{ display: 'flex', color: 'inherit' }}>{tab.icon}</span>
          </motion.a>
        );
      })}
    </nav>
  );
}
