import { motion } from 'framer-motion';
import { Icons } from '../ui';

const HexIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
  </svg>
);

const KYCNIcon = (
  <img src="/3d.png" alt="KYCN" style={{ width: 18, height: 18, objectFit: 'contain', display: 'block' }} />
);

const ProfileIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

const INVESTOR_TABS = [
  { id: 'feed',         label: 'Feed',      icon: Icons.feed  },
  { id: 'dashboard',    label: 'Dashboard', icon: Icons.dash  },
  { id: 'primario',     label: 'Tokens',    icon: HexIcon     },
  { id: 'pertenencias', label: 'Wallet',    icon: Icons.wallet},
  { id: 'perfil',       label: 'Perfil',    icon: ProfileIcon },
];

const ADMIN_TABS = [
  { id: 'admin',        label: 'Inicio',  icon: Icons.dash  },
  { id: 'primario',     label: 'Tokens',  icon: HexIcon     },
  { id: 'pertenencias', label: 'Wallet',  icon: Icons.wallet},
  { id: 'token',        label: 'KYCN',    icon: KYCNIcon    },
  { id: 'perfil',       label: 'Perfil',  icon: ProfileIcon },
];

export default function MobileNavBar({ nav, route, role }) {
  const tabs = role === 'admin' ? ADMIN_TABS : INVESTOR_TABS;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'var(--gl-panel)',
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      borderTop: '1px solid var(--gl-bd)',
      display: 'flex', height: 68,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(t => {
        const active = route === t.id;
        return (
          <motion.button
            key={t.id}
            aria-label={t.label} title={t.label}
            onClick={() => nav(t.id)}
            whileTap={{ scale: 0.82 }}
            style={{
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
            <span className="mnav-ico" style={{ display: 'flex', color: 'inherit' }}>{t.icon}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
