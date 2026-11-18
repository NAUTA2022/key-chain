import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useMobile } from '~/hooks/useMobile';
import { useSession } from '~/lib/session';
import { safeBannerHref, usePublicSettings, type PlatformBanner } from './platform';

// Platform-wide notices from the admin settings: a maintenance bar while
// investments are paused, plus the active banners (dismissible per session).

const STORAGE_KEY = 'kc_dismissed_banners';

function readDismissed(): string[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage blocked (private mode): the banner just stays hidden until reload.
  }
}

const WARN_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d="M12 3L2 20h20L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 10v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="17.2" r="1" fill="currentColor" />
  </svg>
);

const linkStyle: CSSProperties = { color: 'var(--text)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2, whiteSpace: 'nowrap' };

function BannerLink({ banner }: { banner: PlatformBanner }) {
  const target = safeBannerHref(banner.href);
  if (!target) return null;
  if (target.kind === 'internal') return <Link to={target.href} style={linkStyle}>Ver más</Link>;
  return <a href={target.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>Ver más</a>;
}

export default function PlatformBanners() {
  const { status } = useSession();
  const settings = usePublicSettings();
  const isMobile = useMobile();
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  if (status === 'disabled' || !settings) return null;
  const banners = settings.banners.filter(b => b.active && !dismissed.includes(b.id));
  if (!settings.investmentsPaused && banners.length === 0) return null;

  const bar: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '9px 16px' : '9px 32px',
    fontFamily: 'var(--font-b)', fontSize: 13, lineHeight: 1.45, borderBottom: '1px solid var(--border-l)',
  };

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    writeDismissed(next);
  };

  return (
    <div style={{ position: 'relative', zIndex: 2 }}>
      {settings.investmentsPaused && (
        <div role="status" style={{ ...bar, background: 'var(--neg-bg)', color: 'var(--neg)' }}>
          {WARN_ICON}
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontWeight: 700 }}>Inversiones pausadas temporalmente.</strong>{' '}
            <span style={{ color: 'var(--sec)' }}>{settings.maintenanceMessage || 'Estamos haciendo tareas de mantenimiento. Tus tokens y fondos no se ven afectados.'}</span>
          </span>
        </div>
      )}
      {banners.map(b => (
        <div key={b.id} role="note" style={{ ...bar, background: 'var(--surface2)', color: 'var(--sec)' }}>
          <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: '2px 10px', alignItems: 'baseline' }}>
            <span style={{ color: 'var(--text)', overflowWrap: 'anywhere' }}>{b.text}</span>
            <BannerLink banner={b} />
          </span>
          <button
            type="button"
            onClick={() => dismiss(b.id)}
            aria-label="Cerrar aviso"
            style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--ter)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}
