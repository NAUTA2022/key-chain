import { useId, useRef, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Icons, PSection } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import type { NavFn } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import MyRequests from './MyRequests';
import RequestForm from './RequestForm';
import GuideButton from '~/features/guide/GuideButton';

// /tokenizar with the backend enabled: "Nueva solicitud" (the wizard) and "Mis solicitudes".
// The active tab lives in the URL (?vista=solicitudes) so it can be linked and survives reloads.

const TABS = [
  { id: 'nueva', label: 'Nueva solicitud' },
  { id: 'solicitudes', label: 'Mis solicitudes' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function WizardLive({ nav }: { nav: NavFn }) {
  const isMobile = useMobile();
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('vista') === 'solicitudes' ? 'solicitudes' : 'nueva';
  const base = useId();
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  const select = (t: Tab, focus = false) => {
    setParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (t === 'solicitudes') next.set('vista', 'solicitudes');
        else next.delete('vista');
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
    if (focus) tabRefs.current[t]?.focus();
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex(t => t.id === tab);
    const j =
      e.key === 'ArrowRight' ? (i + 1) % TABS.length
        : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length
          : e.key === 'Home' ? 0
            : e.key === 'End' ? TABS.length - 1
              : -1;
    if (j < 0) return;
    e.preventDefault();
    select(TABS[j].id, true);
  };

  return (
    <div style={{ padding: isMobile ? '16px 14px 80px' : '28px 32px 40px', maxWidth: 820, margin: '0 auto' }}>
      <button type="button" onClick={() => nav('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13.5, marginBottom: 24, padding: 0 }}>
        {Icons.back} Volver al panel
      </button>

      <PSection title={<span data-guide="tokenize-title">Tokenizar activo</span>} sub="Cuéntanos sobre tu activo: el equipo de Brikme revisa cada solicitud antes de cualquier publicación." help={<GuideButton tour="tokenize" />} />

      <div role="tablist" aria-label="Solicitudes de tokenización" data-guide="tokenize-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, boxShadow: 'inset 0 -1px 0 var(--border-l)', marginBottom: 24 }}>
        {TABS.map(t => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              ref={el => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={active}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(t.id)}
              onKeyDown={onTabKey}
              style={{
                padding: isMobile ? '10px 12px' : '10px 18px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-b)', fontSize: 13.5, fontWeight: active ? 700 : 450, color: active ? 'var(--text)' : 'var(--ter)',
                borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* The form stays mounted while hidden so a half-filled request survives a tab switch. */}
      <div role="tabpanel" id={`${base}-panel-nueva`} aria-labelledby={`${base}-tab-nueva`} hidden={tab !== 'nueva'}>
        <RequestForm contactName={user?.displayName ?? null} contactEmail={user?.email ?? null} onShowRequests={() => select('solicitudes')} />
      </div>
      <div role="tabpanel" id={`${base}-panel-solicitudes`} aria-labelledby={`${base}-tab-solicitudes`} hidden={tab !== 'solicitudes'}>
        {tab === 'solicitudes' && <MyRequests nav={nav} onNew={() => select('nueva')} />}
      </div>
    </div>
  );
}
