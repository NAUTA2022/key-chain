import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useOutlet } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useActiveWallet, useDisconnect } from 'thirdweb/react';

import Sidebar from '~/components/layout/Sidebar';
import Topbar from '~/components/layout/Topbar';
import MobileNavBar from '~/components/layout/MobileNavBar';
import MenuToggle from '~/components/layout/MenuToggle';
import PlatformBanners from '~/features/banners/PlatformBanners';
import GuideProvider from '~/features/guide/GuideProvider';
import { useMobile } from '~/hooks/useMobile';
import { endDevSession } from '~/lib/devSession';
import { routeKeyFromPath, useNav } from '~/lib/navigation';
import { usePreferences } from '~/lib/preferences';
import { useSession } from '~/lib/session';

const BLOB1: CSSProperties = { position: 'fixed', top: '-15%', right: '10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(70,70,70,0.10) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0, animation: 'float-slow 12s ease-in-out infinite' };
const BLOB2: CSSProperties = { position: 'fixed', bottom: '5%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(50,50,50,0.08) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0, animation: 'float-slow 16s ease-in-out infinite reverse' };
const SHELL_WRAP: CSSProperties = { display: 'flex', height: '100vh', overflow: 'clip', position: 'relative' };
const MAIN_STYLE: CSSProperties = { flex: 1, overflowY: 'auto', marginTop: 64 };

/** App chrome (sidebar, topbar, mobile tab bar) around every in-app page. */
export default function AppShell() {
  const isMobile = useMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const nav = useNav();
  const { theme, setTheme, prefs, setPrefs, role: localRole, collapsed, setCollapsed } = usePreferences();
  const session = useSession();
  // The UI distinguishes admins from everyone else; the role comes from the backend session.
  // While /auth/me loads, the last role seen in this browser draws the menu (pages stay guarded).
  const role =
    session.status === 'disabled' ? localRole
    : session.status === 'loading' ? (session.roleHint === 'admin' ? 'admin' : 'investor')
    : session.user?.role === 'admin' ? 'admin' : 'investor';
  // Live company accounts (any status) and admins get the "Tokenizar activo" entry; demo mode never does.
  const canTokenize = session.status === 'authenticated' && !!session.user && (session.user.role === 'admin' || session.user.company !== null);
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();

  const route = routeKeyFromPath(location.pathname) ?? 'feed';
  // The 2D ecosystem (demo) fills the viewport; live mode shows a normal scrolling ComingSoon page.
  const isEco = route === 'ecosistema' && session.status === 'disabled';

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  // Logout leaves the private area first and drops the wallet / dev session once the shell has
  // unmounted: doing it while a guarded page is still mounted makes the guard bounce to /ingresar.
  const pendingTeardown = useRef<(() => void) | null>(null);
  useEffect(() => {
    const teardown = pendingTeardown;
    return () => teardown.current?.();
  }, []);

  // Losing the session while inside the app (wallet disconnected from the wallet menu, locked, switched)
  // sends the user to the login, public pages included. The "Cerrar sesión" button goes home instead.
  const manualLogout = useRef(false);
  const lastStatus = useRef(session.status);
  useEffect(() => {
    if (lastStatus.current === 'authenticated' && session.status === 'anonymous' && !manualLogout.current) navigate('/ingresar', { replace: true });
    lastStatus.current = session.status;
  }, [session.status, navigate]);

  const onLogout = () => {
    manualLogout.current = true;
    void session.logout();
    pendingTeardown.current = () => {
      endDevSession();
      if (wallet) disconnect(wallet);
    };
    navigate('/');
  };

  const pageContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
        style={isEco ? { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' } : {}}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );

  if (isMobile) {
    return (
      <GuideProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <Topbar
          theme={theme} setTheme={setTheme}
          prefs={prefs} setPrefs={setPrefs}
          nav={nav} isMobile
          onLogout={onLogout}
        />
        <main ref={mainRef} style={{ flex: 1, overflowY: isEco ? 'hidden' : 'auto', paddingBottom: isEco ? 0 : 64, ...(isEco && { display: 'flex', flexDirection: 'column' }) }}>
          {!isEco && <PlatformBanners />}
          {pageContent}
        </main>
        <MobileNavBar nav={nav} route={route} role={role} onMore={() => setDrawerOpen(true)} />
        <Sidebar
          nav={nav} route={route} role={role} canTokenize={canTokenize} theme={theme}
          collapsed={false} setCollapsed={() => {}}
          drawerMode drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)}
          onLogout={onLogout}
        />
        <MenuToggle open={drawerOpen} onToggle={() => setDrawerOpen(o => !o)} />
      </div>
      </GuideProvider>
    );
  }

  return (
    <GuideProvider>
    <div style={SHELL_WRAP}>
      <div style={BLOB1} />
      <div style={BLOB2} />
      <div className="cursor-light" />
      <div className="kc-shell-sidebar">
        <Sidebar
          nav={nav} route={route} role={role} canTokenize={canTokenize} theme={theme}
          collapsed={collapsed} setCollapsed={setCollapsed}
          onLogout={onLogout}
        />
      </div>
      <div className="kc-shell-content" style={{
        marginLeft: collapsed ? 58 : 232,
        transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)',
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        position: 'relative', zIndex: 1,
      }}>
        <Topbar
          theme={theme} setTheme={setTheme}
          prefs={prefs} setPrefs={setPrefs}
          nav={nav} sidebarCollapsed={collapsed}
        />
        <main ref={mainRef} style={{ ...MAIN_STYLE, ...(isEco && { overflowY: 'hidden', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }) }}>
          {/* Live mode only: maintenance bar + admin banners (renders nothing in demo mode). */}
          {!isEco && <PlatformBanners />}
          {pageContent}
        </main>
      </div>
    </div>
    </GuideProvider>
  );
}
