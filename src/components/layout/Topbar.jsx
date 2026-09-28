import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectButton } from 'thirdweb/react';
import { polygon } from 'thirdweb/chains';
import { PLogo, PAvatar, PDiv, Icons } from '../ui';
import { NOTIFICATIONS } from '../../data';
import { client } from '../../lib/client';

// ─── ECOSYSTEM AUDIO ────────────────────────────────────────────────────────
// Fades in over 1s when entering the 3D ecosystem view, fades back out over 1s
// when leaving it (or on manual pause) — never a hard cut. Topbar itself never
// unmounts on route change, so a single <audio> instance can live for the
// whole session and survive the ecosistema page mounting/unmounting.
const FADE_MS = 1000;

function useEcosystemAudio(route) {
  const audioRef = useRef(null);
  const targetVolRef = useRef(1);
  const fadeRAF = useRef(null);
  const prevRoute = useRef(route);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(100);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio('/music/music3d.mp3');
      audio.loop = true;
      audio.volume = 0;
      audioRef.current = audio;
    }
  }, []);

  const fadeTo = (target, duration, onDone) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeRAF.current) cancelAnimationFrame(fadeRAF.current);
    const start = performance.now();
    const from = audio.volume;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      audio.volume = from + (target - from) * t;
      if (t < 1) {
        fadeRAF.current = requestAnimationFrame(step);
      } else {
        fadeRAF.current = null;
        onDone?.();
      }
    };
    fadeRAF.current = requestAnimationFrame(step);
  };

  const startPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => {});
    setPlaying(true);
    fadeTo(targetVolRef.current, FADE_MS);
  };

  const stopPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    fadeTo(0, FADE_MS, () => audio.pause());
    setPlaying(false);
  };

  useEffect(() => {
    const entering = route === 'ecosistema' && prevRoute.current !== 'ecosistema';
    const leaving = route !== 'ecosistema' && prevRoute.current === 'ecosistema';
    prevRoute.current = route;
    if (entering) startPlayback();
    if (leaving) stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  useEffect(() => () => {
    if (fadeRAF.current) cancelAnimationFrame(fadeRAF.current);
    audioRef.current?.pause();
  }, []);

  const toggle = () => (playing ? stopPlayback() : startPlayback());

  const changeVolume = (v) => {
    setVolume(v);
    targetVolRef.current = v / 100;
    const audio = audioRef.current;
    if (playing && audio) {
      if (fadeRAF.current) cancelAnimationFrame(fadeRAF.current);
      audio.volume = v / 100;
    }
  };

  return { playing, volume, toggle, changeVolume };
}

function MusicPlayer({ playing, volume, toggle, changeVolume }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--surface2)', borderRadius: 999,
      padding: '6px 12px 6px 6px', flexShrink: 0,
    }}>
      <button onClick={toggle} title={playing ? 'Pausar música' : 'Reproducir música'} style={{
        width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {playing
          ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>
          : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l15 8-15 8V4z"/></svg>}
      </button>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--sec)', flexShrink: 0 }}>
        <path d="M3 10v4h4l5 4V6L7 10H3z" fill="currentColor"/>
        <path d="M16 8a5 5 0 010 8M18.5 5.5a9 9 0 010 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      <input
        type="range" min={0} max={100} value={volume}
        onChange={(e) => changeVolume(Number(e.target.value))}
        style={{ width: 64, accentColor: 'var(--accent)', cursor: 'pointer' }}
        title="Volumen"
      />
    </div>
  );
}

const FONT_OPTIONS = [
  { id: 'moderna',    label: 'Moderna',    sub: 'DM Sans + Inter',          h: '"DM Sans", sans-serif',       b: '"Inter", sans-serif' },
  { id: 'geometrica', label: 'Geométrica', sub: 'Space Grotesk + IBM Plex', h: '"Space Grotesk", sans-serif', b: '"IBM Plex Sans", sans-serif' },
  { id: 'humanista',  label: 'Humanista',  sub: 'Manrope',                  h: '"Manrope", sans-serif',       b: '"Manrope", sans-serif' },
  { id: 'tech',       label: 'Tech',       sub: 'Sora + Inter',             h: '"Sora", sans-serif',          b: '"Inter", sans-serif' },
];
const PALETTE_OPTIONS = [
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

function NotifPanel({ open, onClose }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'absolute', top: 52, right: 0, width: 360, zIndex: 95,
          // Stronger than --gl-panel: this sits inside the Topbar, which has
          // its own backdrop-filter, so the panel's blur barely reaches the
          // page behind it — the extra opacity is what keeps it readable.
          background: 'var(--gl-panel-strong)', backdropFilter: 'blur(28px) saturate(160%) brightness(1.02)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%) brightness(1.02)',
          borderRadius: 18, boxShadow: 'var(--sh-lg)',
          border: '1px solid var(--gl-bd)', overflow: 'hidden',
          maxWidth: 'calc(100vw - 24px)',
        }}
      >
        <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Notificaciones</span>
          <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>Marcar leídas</span>
        </div>
        <PDiv />
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {NOTIFICATIONS.map((n, i) => (
            <div key={n.id} style={{
              padding: '13px 18px', display: 'flex', gap: 12,
              background: n.unread ? 'var(--surface2)' : 'transparent',
              borderBottom: i < NOTIFICATIONS.length - 1 ? '1px solid var(--border-l)' : 'none',
              cursor: 'pointer',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', flexShrink: 0 }}>
                {Icons.bell}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{n.title}</span>
                  {n.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />}
                </div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', marginTop: 2, lineHeight: 1.45 }}>{n.desc}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', marginTop: 3 }}>{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}

function PersonalizePanel({ open, onClose, prefs, setPrefs }) {
  if (!open) return null;
  const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }));
  const sl = { fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 };
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
          <button onClick={() => setPrefs({ rubro: 'Todos', font: 'moderna', palette: 'mono' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>Restablecer</button>
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

export default function Topbar({ theme, setTheme, nav, route, prefs, setPrefs, sidebarCollapsed, isMobile, onMenuOpen, onLogout }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [persOpen, setPersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const unread = NOTIFICATIONS.filter(n => n.unread).length;
  const audio = useEcosystemAudio(route);

  const iconBtn = (active, onClick, children, title) => (
    <button onClick={onClick} title={title}
      className={`nav-icon-glass topbar-icon-btn${active ? ' is-active' : ''}`}
      style={{ cursor: 'pointer', color: active ? 'var(--gl-nav-a)' : 'var(--gl-nav)', flexShrink: 0 }}
    >{children}</button>
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
        {/* Hamburger */}
        <button onClick={onMenuOpen} style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--border-l)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sec)', flexShrink: 0 }}>
          {HAMBURGER_ICON}
        </button>

        {/* Logo centered — link a inicio */}
        <button onClick={() => nav('dashboard')} style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <img src={theme === 'dark' ? '/iconow.png' : '/icono.png'} alt="KEY CHAIN" style={{ height: 34, width: 'auto', objectFit: 'contain', display: 'block' }} />
        </button>

        <div style={{ flex: 1 }} />

        {/* Reproductor — solo en el ecosistema 3D */}
        {route === 'ecosistema' && (
          <button onClick={audio.toggle} title={audio.playing ? 'Pausar música' : 'Reproducir música'} style={{
            width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {audio.playing
              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>
              : <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l15 8-15 8V4z"/></svg>}
          </button>
        )}

        {/* Cambiar tema — sin recuadro */}
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} style={{ width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sec)', flexShrink: 0 }}>
          {theme === 'light' ? Icons.moon : Icons.sun}
        </button>

        {/* Notificaciones — sin recuadro */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setNotifOpen(o => !o); setMoreOpen(false); setPersOpen(false); }} style={{ width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sec)', position: 'relative', flexShrink: 0 }}>
            {Icons.bell}
            {unread > 0 && <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 999, background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid var(--surface)' }}>{unread}</span>}
          </button>
          <AnimatePresence>{notifOpen && <NotifPanel open={notifOpen} onClose={() => setNotifOpen(false)} />}</AnimatePresence>
        </div>

        {/* Más */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setMoreOpen(o => !o); setNotifOpen(false); setPersOpen(false); }} style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${moreOpen ? 'var(--accent)' : 'var(--border-l)'}`, background: moreOpen ? 'var(--surface2)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: moreOpen ? 'var(--accent)' : 'var(--sec)', flexShrink: 0 }}>
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
                  {/* Configuración */}
                  <button onClick={() => { nav('config'); closeAll(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: 500 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.7"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.7"/></svg>
                    Configuración
                  </button>
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface2)', borderRadius: 11,
        padding: '9px 14px', width: 300, color: 'var(--ter)', cursor: 'pointer',
      }}>
        {Icons.search}
        <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5 }}>Buscar proyectos, tokens…</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Reproductor — solo en el ecosistema 3D */}
      {route === 'ecosistema' && (
        <MusicPlayer playing={audio.playing} volume={audio.volume} toggle={audio.toggle} changeVolume={audio.changeVolume} />
      )}

      {/* Theme */}
      {iconBtn(false, () => setTheme(t => t === 'light' ? 'dark' : 'light'),
        theme === 'light' ? Icons.moon : Icons.sun, 'Cambiar tema')}

      {/* Personalization */}
      <div style={{ position: 'relative' }}>
        {iconBtn(persOpen, () => { setPersOpen(o => !o); setNotifOpen(false); },
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <circle cx="9" cy="7" r="2.6" fill="var(--surface)" stroke="currentColor" strokeWidth="1.7"/>
            <circle cx="15" cy="17" r="2.6" fill="var(--surface)" stroke="currentColor" strokeWidth="1.7"/>
          </svg>, 'Personalización')}
        <AnimatePresence>
          {persOpen && <PersonalizePanel open={persOpen} onClose={() => setPersOpen(false)} prefs={prefs} setPrefs={setPrefs} />}
        </AnimatePresence>
      </div>

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => { setNotifOpen(o => !o); setPersOpen(false); }}
          className={`nav-icon-glass topbar-icon-btn${notifOpen ? ' is-active' : ''}`}
          style={{ cursor: 'pointer', color: notifOpen ? 'var(--gl-nav-a)' : 'var(--gl-nav)', position: 'relative', overflow: 'visible' }}
        >
          {Icons.bell}
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17,
              borderRadius: 999, background: 'var(--accent)', color: 'var(--accent-fg)',
              fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px', border: '2px solid var(--surface)',
              zIndex: 10,
            }}>{unread}</span>
          )}
        </button>
        <AnimatePresence>
          {notifOpen && <NotifPanel open={notifOpen} onClose={() => setNotifOpen(false)} />}
        </AnimatePresence>
      </div>

      {/* Wallet + Avatar — thirdweb's own ConnectButton already shows the
          connected address (plus avatar and balance) once connected, so it's
          the single source of truth here instead of duplicating it. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        padding: '4px 4px 4px 4px', borderRadius: 999,
        border: '1.5px solid var(--border-l)',
      }}>
        <ConnectButton
          client={client}
          chain={polygon}
          connectButton={{ label: 'Conectar', style: {
            padding: '4px 12px', fontSize: 12, fontFamily: 'var(--font-b)',
            fontWeight: 700, borderRadius: 8, cursor: 'pointer', height: 30,
            background: 'var(--accent)', color: '#fff', border: 'none',
          }}}
          detailsButton={{ style: {
            height: 'auto', minHeight: 44, padding: '4px 10px', borderRadius: 999,
            background: 'transparent', border: 'none', overflow: 'visible',
          }}}
          connectModal={{ title: 'Conectar a KEY CHAIN', titleIcon: '' }}
        />
      </div>
    </div>
  );
}
