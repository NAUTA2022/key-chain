import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ThirdwebProvider } from 'thirdweb/react';
import { useSessionAccount, startDevSession, endDevSession } from './lib/devSession';
import { AnimatePresence, motion } from 'framer-motion';
import { playMouseMove } from './lib/sound';

import Landing from './pages/Landing';
import KeyPayLogin from './pages/KeyPayLogin';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import MobileNavBar from './components/layout/MobileNavBar';
import { useMobile } from './hooks/useMobile';

import Dashboard from './pages/Dashboard';
import PrimaryMarket from './pages/PrimaryMarket';
import SecondaryMarket from './pages/SecondaryMarket';
import ProductDetail from './pages/ProductDetail';
import GlobalFeed from './pages/GlobalFeed';
import CompanyProfile from './pages/CompanyProfile';
import Checkout from './pages/Checkout';
import TokenUtility from './pages/TokenUtility';
import Holdings from './pages/Holdings';
import Academy from './pages/Academy';
import Article from './pages/Article';
import Profile from './pages/Profile';
import HelpCenter from './pages/HelpCenter';
import Admin from './pages/Admin';
import Config from './pages/Config';
import Wizard from './pages/Wizard';
import Ecosystem from './pages/Ecosystem';
import KeyPay from './pages/KeyPay';
import KeyDrive from './pages/KeyDrive';
import KeyJobs from './pages/KeyJobs';
import EscrowChain from './pages/EscrowChain';
import AssetTracker from './pages/AssetTracker';
import TenantPortal from './pages/TenantPortal';

import Bookey from './pages/Bookey';
import KeyRural from './pages/KeyRural';

const ADMIN_EMAIL = 'andresquinteros2017@gmail.com';

const FONTS = {
  moderna:    { h: '"DM Sans", sans-serif',       b: '"Inter", sans-serif'         },
  geometrica: { h: '"Space Grotesk", sans-serif', b: '"IBM Plex Sans", sans-serif' },
  humanista:  { h: '"Manrope", sans-serif',       b: '"Sora", sans-serif'          },
  tech:       { h: '"Space Grotesk", sans-serif', b: '"IBM Plex Mono", monospace'  },
};

const BLOB1 = { position: 'fixed', top: '-15%', right: '10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(70,70,70,0.10) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0, animation: 'float-slow 12s ease-in-out infinite' };
const BLOB2 = { position: 'fixed', bottom: '5%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(50,50,50,0.08) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0, animation: 'float-slow 16s ease-in-out infinite reverse' };
const SHELL_WRAP = { display: 'flex', height: '100vh', overflow: 'clip', position: 'relative' };
const MAIN_STYLE = { flex: 1, overflowY: 'auto', marginTop: 64 };

// ─── Shell (Keychain UI wrapper) ────────────────────────────────────────────

function Shell({ nav, route, routeData, prevRoute, theme, setTheme, prefs, setPrefs, role, collapsed, setCollapsed, onLogout }) {
  const isMobile = useMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [route]);

  // KeyPay is a standalone, self-themed component (not built on the platform's
  // design system) so it can be reused elsewhere or served independently later
  // (e.g. as an API-backed widget). It bypasses the Sidebar/Topbar chrome
  // entirely and fills 100% of the viewport itself.
  if (route === 'keypay') {
    // Every "go pay" CTA across the app (ProductDetail, Dashboard,
    // TokenUtility, SecondaryMarket, TenantPortal, Checkout.jsx) hands its
    // purchase off as a pending payment then routes here with
    // routeData = { screen: 'cart', focusId }, so it opens straight into
    // KeyPay's Checkout scoped to just that one payment — not the whole
    // shared pending inbox (which can carry unrelated leftover items).
    const wantsCart = routeData === 'cart' || routeData?.screen === 'cart';
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <KeyPay nav={nav} onClose={() => nav('dashboard')} initialModal={wantsCart ? 'cart' : null} cartFocusId={routeData?.focusId ?? null} />
      </div>
    );
  }

  const page = () => {
    switch (route) {
      case 'feed':         return <GlobalFeed nav={nav} />;
      case 'empresa':      return <CompanyProfile key={routeData} nav={nav} name={routeData} fromRoute={prevRoute} />;
      case 'dashboard':    return <Dashboard nav={nav} />;
      case 'primario':     return <PrimaryMarket nav={nav} rubro={prefs.rubro} />;
      case 'secundario':   return <SecondaryMarket nav={nav} />;
      case 'detalle':      return <ProductDetail nav={nav} asset={routeData} fromRoute={prevRoute} />;
      case 'checkout':     return <Checkout nav={nav} data={routeData} />;
      case 'token':        return <TokenUtility nav={nav} />;
      case 'pertenencias': return <Holdings nav={nav} />;
      case 'ecosistema':   return <Ecosystem nav={nav} />;
      case 'inquilino':    return <TenantPortal nav={nav} property={routeData} />;
      case 'academia':     return <Academy nav={nav} />;
      case 'articulo':     return <Article nav={nav} post={routeData} />;
      case 'perfil':       return <Profile nav={nav} />;
      case 'ayuda':        return <HelpCenter nav={nav} />;
      case 'admin':        return <Admin nav={nav} />;
      case 'config':       return <Config nav={nav} />;
      case 'wizard':       return <Wizard nav={nav} />;
      default:             return <Dashboard nav={nav} />;
    }
  };

  const pageContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={route}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
        style={route === 'ecosistema' ? { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' } : {}}
      >
        {page()}
      </motion.div>
    </AnimatePresence>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <Topbar
          theme={theme} setTheme={setTheme}
          prefs={prefs} setPrefs={setPrefs}
          nav={nav} route={route} isMobile onMenuOpen={() => setDrawerOpen(true)}
        />
        <main ref={mainRef} style={{ flex: 1, overflowY: route === 'ecosistema' ? 'hidden' : 'auto', paddingBottom: route === 'ecosistema' ? 0 : 64, ...(route === 'ecosistema' && { display: 'flex', flexDirection: 'column' }) }}>
          {pageContent}
        </main>
        <MobileNavBar nav={nav} route={route} role={role} onMore={() => setDrawerOpen(true)} />
        <Sidebar
          nav={nav} route={route} role={role} theme={theme}
          collapsed={false} setCollapsed={() => {}}
          drawerMode drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)}
          onLogout={onLogout}
        />
      </div>
    );
  }

  return (
    <div style={SHELL_WRAP}>
      <div className="dot-cursor-glow" />
      <div style={BLOB1} />
      <div style={BLOB2} />
      <div className="cursor-light" />
      <Sidebar
        nav={nav} route={route} role={role} theme={theme}
        collapsed={collapsed} setCollapsed={setCollapsed}
        onLogout={onLogout}
      />
      <div style={{
        marginLeft: collapsed ? 58 : 232,
        transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)',
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        position: 'relative', zIndex: 1,
      }}>
        <Topbar
          theme={theme} setTheme={setTheme}
          prefs={prefs} setPrefs={setPrefs}
          nav={nav} route={route} sidebarCollapsed={collapsed}
        />
        <main ref={mainRef} style={{ ...MAIN_STYLE, ...(route === 'ecosistema' && { overflowY: 'hidden', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }) }}>
          {pageContent}
        </main>
      </div>
    </div>
  );
}

// ─── Standalone platform wrappers ────────────────────────────────────────────
// Same pattern as Bookey: full pages reachable by their own URL, outside the
// login-gated Shell/Sidebar chrome. KeyDrive/EscrowChain/AssetTracker rely on
// the platform's --font-h/--font-b/--bg/--text CSS variables (unlike Bookey,
// which is fully self-themed), so each wrapper sets the same dark/mono theme
// KeychainApp defaults to, since that data-theme attribute normally only
// gets set once KeychainApp itself mounts.
function useDarkTheme() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-palette', 'mono');
  }, []);
}

function BookeyPlatform() {
  // Bookey is neo-minimalist and light-only by design — force it regardless
  // of whatever data-theme a prior KeychainApp session left on <html>.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-palette', 'mono');
  }, []);
  return <Bookey />;
}

function KeyJobsPlatform() {
  // Key Jobs is a light, clean LinkedIn/Indeed-style hybrid — same forced
  // light theme reasoning as Bookey, regardless of the platform's own theme.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-palette', 'mono');
  }, []);
  return <KeyJobs />;
}

function KeyRuralPlatform() {
  // Key Rural is a neo-minimalist, editorial-photography-led product —
  // same forced light theme reasoning as Bookey/Key Jobs, regardless of
  // whatever data-theme the platform's own Shell currently has.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-palette', 'mono');
  }, []);
  return <KeyRural />;
}

function KeyDrivePlatform() {
  useDarkTheme();
  return <div style={{ minHeight: '100vh', background: 'var(--bg)' }}><KeyDrive /></div>;
}

function EscrowChainPlatform() {
  useDarkTheme();
  return <div style={{ minHeight: '100vh', background: 'var(--bg)' }}><EscrowChain /></div>;
}

function AssetTrackerPlatform() {
  useDarkTheme();
  return <div style={{ minHeight: '100vh', background: 'var(--bg)' }}><AssetTracker /></div>;
}

function KeyPayPlatform() {
  // KeyPay is fully self-themed (own --kp-* variables set on its own root),
  // same as Bookey — it doesn't need the platform's data-theme at all, just
  // a full-viewport frame to render into.
  const navigate = useNavigate();
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <KeyPay onClose={() => navigate('/')} />
    </div>
  );
}

// ─── Keychain app ─────────────────────────────────────────────────────────────

const PLATFORM_PATHS = {
  'bookey': '/bookey',
  'keydrive': '/key-drive',
  'keyjobs': '/key-jobs',
  'keyrural': '/key-rural',
  'escrow': '/escrow-chain',
  'tracker': '/tracker-gps',
};

function KeychainApp() {
  const account = useSessionAccount();
  const navigate = useNavigate();
  const [view, setView]           = useState('landing');
  const [theme, setTheme]         = useState('dark');
  const [palette, setPalette]     = useState('mono');
  const [font, setFont]           = useState('moderna');
  const [rubro, setRubro]         = useState('Todos');
  const [role, setRole]           = useState('investor');
  const [collapsed, setCollapsed] = useState(false);
  const [route, setRoute]         = useState('feed');
  const [routeData, setRouteData] = useState(null);
  // Tracks the route we just came from, so pages like ProductDetail can send
  // "volver" back to wherever the user actually arrived from (Mercado
  // Primario vs. Secundario vs. Dashboard) instead of a single hardcoded tab.
  const prevRouteRef = useRef('feed');

  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [adminEmail, setAdminEmail]       = useState('');
  const [adminError, setAdminError]       = useState('');

  const nav = useCallback((page, data = null) => {
    if (PLATFORM_PATHS[page]) {
      navigate(PLATFORM_PATHS[page]);
    } else {
      prevRouteRef.current = route;
      setRoute(page);
      setRouteData(data);
    }
  }, [navigate, route]);

  useEffect(() => {
    if (account) {
      setView('app');
    } else {
      setView(v => v === 'app' ? 'landing' : v);
    }
  }, [account]);

  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setAdminAuthOpen(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    let lx = 0, ly = 0;
    const move = (e) => {
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      document.documentElement.style.setProperty('--cx', `${e.clientX}px`);
      document.documentElement.style.setProperty('--cy', `${e.clientY}px`);
      playMouseMove(dx, dy);
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { document.documentElement.setAttribute('data-palette', palette); }, [palette]);
  useEffect(() => {
    const f = FONTS[font] || FONTS.moderna;
    document.documentElement.style.setProperty('--font-h', f.h);
    document.documentElement.style.setProperty('--font-b', f.b);
  }, [font]);

  const prefs = { palette, font, rubro };
  const setPrefs = (updater) => {
    const current = { palette, font, rubro };
    const next = typeof updater === 'function' ? updater(current) : updater;
    if (next.palette !== undefined && next.palette !== palette) setPalette(next.palette);
    if (next.font    !== undefined && next.font    !== font)    setFont(next.font);
    if (next.rubro   !== undefined && next.rubro   !== rubro)   setRubro(next.rubro);
  };

  const handleAdminLogin = () => {
    if (adminEmail.toLowerCase().trim() === ADMIN_EMAIL) {
      setRole('admin');
      setAdminAuthOpen(false);
      setView('app');
      nav('admin');
    } else {
      setAdminError('Email no autorizado.');
    }
  };

  return (
    <>
      {view === 'landing' && <Landing onEnter={() => setView('login')} onDevEnter={startDevSession} />}
      {view === 'login' && (
        <KeyPayLogin onSuccess={() => setView('app')} onBack={() => setView('landing')} />
      )}
      {view === 'app' && (
        <Shell
          nav={nav} route={route} routeData={routeData} prevRoute={prevRouteRef.current}
          theme={theme} setTheme={setTheme}
          prefs={prefs} setPrefs={setPrefs}
          role={role}
          collapsed={collapsed} setCollapsed={setCollapsed}
          onLogout={() => { endDevSession(); setView('landing'); setRoute('feed'); }}
        />
      )}

      {adminAuthOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={{
              background: 'var(--surface)', borderRadius: 22, padding: '36px 32px',
              width: 380, boxShadow: 'var(--sh-lg)', border: '1px solid var(--border-l)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 6 }}>Panel de administración</div>
            <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', marginBottom: 28, lineHeight: 1.5 }}>
              Ingresá tu email de administrador para continuar.
            </div>
            <input
              type="email"
              placeholder="admin@email.com"
              value={adminEmail}
              autoFocus
              onChange={e => { setAdminEmail(e.target.value); setAdminError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
              style={{
                width: '100%', padding: '13px 16px', borderRadius: 12,
                border: `1.5px solid ${adminError ? 'var(--neg)' : 'var(--border)'}`,
                background: 'var(--surface2)', fontFamily: 'var(--font-b)', fontSize: 14,
                color: 'var(--text)', outline: 'none', boxSizing: 'border-box', marginBottom: 8,
              }}
            />
            {adminError && (
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--neg)', marginBottom: 12 }}>{adminError}</div>
            )}
            <button
              onClick={handleAdminLogin}
              style={{
                width: '100%', padding: '13px', borderRadius: 12, marginTop: adminError ? 0 : 8,
                background: 'var(--accent)', color: 'var(--accent-fg)',
                fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14,
                border: 'none', cursor: 'pointer',
              }}
            >
              Ingresar
            </button>
            <button
              onClick={() => setAdminAuthOpen(false)}
              style={{
                width: '100%', padding: '10px', borderRadius: 12, marginTop: 8,
                background: 'transparent', color: 'var(--ter)',
                fontFamily: 'var(--font-b)', fontSize: 13, border: 'none', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}

// ─── Root router ─────────────────────────────────────────────────────────────

function PlatformRouter() {
  return (
    <Routes>
      <Route path="/bookey/*"       element={<BookeyPlatform />} />
      <Route path="/key-drive/*"    element={<KeyDrivePlatform />} />
      <Route path="/key-jobs/*"     element={<KeyJobsPlatform />} />
      <Route path="/key-rural/*"    element={<KeyRuralPlatform />} />
      <Route path="/escrow-chain/*" element={<EscrowChainPlatform />} />
      <Route path="/tracker-gps/*"  element={<AssetTrackerPlatform />} />
      <Route path="/keypay/*"       element={<KeyPayPlatform />} />
      <Route path="/*"              element={<KeychainApp />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThirdwebProvider>
      <BrowserRouter>
        <PlatformRouter />
      </BrowserRouter>
    </ThirdwebProvider>
  );
}
