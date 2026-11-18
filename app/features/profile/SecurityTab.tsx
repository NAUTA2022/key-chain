import { useState } from 'react';
import { PBtn, PTag } from '~/components/ui';
import { api } from '~/lib/api/client';
import { useSession } from '~/lib/session';
import { call, errorText, fmtDate, fmtDateTime } from './api';
import { useSessions, type SessionRow } from './hooks';
import { ConfirmDialog, EmptyState, Notice, Section, Skeleton } from './kit';
import { bodyStyle, mutedStyle } from './styles';

// Seguridad (live): the account is protected by the wallet signature (SIWE), so instead of
// the demo 2FA/SMS options this tab lists the active sessions and lets the user close them.

function deviceName(ua: string | null): string {
  if (!ua) return 'Dispositivo desconocido';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} en ${os}` : browser;
}

type Target = { kind: 'one'; row: SessionRow } | { kind: 'others' };

export default function SecurityTab() {
  const { logout } = useSession();
  const { data: sessions, loading, error, reload } = useSessions();
  const [target, setTarget] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const others = sessions?.filter(s => !s.current).length ?? 0;
  const list = sessions ? [...sessions].sort((a, b) => Number(b.current) - Number(a.current) || Date.parse(b.createdAt) - Date.parse(a.createdAt)) : [];

  async function confirm() {
    if (!target) return;
    setBusy(true);
    setNotice(null);
    if (target.kind === 'others') {
      const { data, error: e } = await call(api.POST('/v1/me/sessions/revoke-others'));
      setBusy(false);
      setTarget(null);
      if (!data) return setNotice({ tone: 'error', text: errorText(e, 'No pudimos cerrar las otras sesiones.') });
      setNotice({ tone: 'success', text: data.revoked === 1 ? 'Cerramos 1 sesión.' : `Cerramos ${data.revoked} sesiones.` });
      return reload();
    }
    const { row } = target;
    // DELETE answers 204 (no body): judge by the HTTP status.
    const ok = await api
      .DELETE('/v1/me/sessions/{id}', { params: { path: { id: row.id } } })
      .then(r => r.response.ok)
      .catch(() => false);
    setBusy(false);
    setTarget(null);
    if (!ok) return setNotice({ tone: 'error', text: 'No pudimos cerrar esa sesión. Probá de nuevo.' });
    if (row.current) {
      // Closing this device's session signs the user out here too.
      await logout();
      return;
    }
    setNotice({ tone: 'success', text: 'Sesión cerrada.' });
    reload();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section
        title="Sesiones activas"
        action={<PBtn variant="secondary" small disabled={!others || busy} onClick={() => setTarget({ kind: 'others' })}>Cerrar las demás</PBtn>}
      >
        {loading && !sessions ? (
          <Skeleton rows={3} height={44} />
        ) : error && !sessions ? (
          <Notice tone="error">No pudimos cargar tus sesiones.</Notice>
        ) : list.length === 0 ? (
          <EmptyState title="No hay sesiones activas" />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(s => (
              <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${s.current ? 'var(--accent)' : 'var(--border-l)'}`, background: s.current ? 'var(--accent-bg)' : 'var(--surface2)', flexWrap: 'wrap' }}>
                <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sec)', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{deviceName(s.userAgent)}</span>
                    {s.current && <PTag label="Este dispositivo" color="green" />}
                  </div>
                  <div style={{ ...mutedStyle, fontSize: 12, marginTop: 3 }}>
                    {s.ip ? `IP ${s.ip} · ` : ''}Inició {fmtDateTime(s.createdAt)} · Vence {fmtDate(s.expiresAt)}
                  </div>
                </div>
                <PBtn variant="secondary" small disabled={busy} onClick={() => setTarget({ kind: 'one', row: s })}>Cerrar sesión</PBtn>
              </li>
            ))}
          </ul>
        )}
        {notice && <Notice tone={notice.tone} style={{ marginTop: 14 }}>{notice.text}</Notice>}
      </Section>

      <Section title="Cómo protegemos tu cuenta">
        <p style={bodyStyle}>
          Entrás firmando con tu wallet: no usamos contraseñas ni códigos por SMS. Si ves una sesión que no reconocés, cerrala y revisá la seguridad de tu wallet. Cerrar la sesión de este dispositivo te pide volver a firmar.
        </p>
      </Section>

      <ConfirmDialog
        open={target !== null}
        onClose={() => !busy && setTarget(null)}
        onConfirm={() => void confirm()}
        busy={busy}
        title={target?.kind === 'others' ? 'Cerrar las demás sesiones' : target?.row.current ? 'Cerrar esta sesión' : 'Cerrar sesión'}
        confirmLabel={target?.kind === 'others' ? `Cerrar ${others} ${others === 1 ? 'sesión' : 'sesiones'}` : 'Cerrar sesión'}
      >
        {target?.kind === 'others'
          ? 'Vas a cerrar la sesión en todos tus otros dispositivos. Este dispositivo sigue conectado.'
          : target?.row.current
            ? 'Vas a cerrar la sesión en este dispositivo. Para volver a entrar vas a tener que firmar con tu wallet.'
            : `Vas a cerrar la sesión de ${deviceName(target?.row.userAgent ?? null)}.`}
      </ConfirmDialog>
    </div>
  );
}
