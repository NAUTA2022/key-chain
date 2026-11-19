import { useState } from 'react';
import { PBtn, PTag } from '~/components/ui';
import { api } from '~/lib/api/client';
import { useT } from '~/i18n/useT';
import { useSession } from '~/lib/session';
import { call, errorText, fmtDate, fmtDateTime, type ProfileT } from './api';
import { useSessions, type SessionRow } from './hooks';
import { ConfirmDialog, EmptyState, Notice, Section, Skeleton } from './kit';
import { bodyStyle, mutedStyle } from './styles';

// Seguridad (live): the account is protected by the wallet signature (SIWE), so instead of
// the demo 2FA/SMS options this tab lists the active sessions and lets the user close them.

function deviceName(ua: string | null, t: ProfileT): string {
  if (!ua) return t('security.unknownDevice');
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : t('security.browser');
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? t('security.deviceOn', { browser, os }) : browser;
}

type Target = { kind: 'one'; row: SessionRow } | { kind: 'others' };

export default function SecurityTab() {
  const { t, locale } = useT('profile');
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
      if (!data) return setNotice({ tone: 'error', text: errorText(e, t('security.closeOthersError'), {}, t) });
      setNotice({ tone: 'success', text: t(data.revoked === 1 ? 'security.closedOne' : 'security.closedOther', { count: data.revoked }) });
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
    if (!ok) return setNotice({ tone: 'error', text: t('security.closeOneError') });
    if (row.current) {
      // Closing this device's session signs the user out here too.
      await logout();
      return;
    }
    setNotice({ tone: 'success', text: t('security.closed') });
    reload();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section
        title={t('security.activeTitle')}
        action={<PBtn variant="secondary" small disabled={!others || busy} onClick={() => setTarget({ kind: 'others' })}>{t('security.closeOthers')}</PBtn>}
      >
        {loading && !sessions ? (
          <Skeleton rows={3} height={44} />
        ) : error && !sessions ? (
          <Notice tone="error">{t('security.loadError')}</Notice>
        ) : list.length === 0 ? (
          <EmptyState title={t('security.empty')} />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(s => (
              <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${s.current ? 'var(--accent)' : 'var(--border-l)'}`, background: s.current ? 'var(--accent-bg)' : 'var(--surface2)', flexWrap: 'wrap' }}>
                <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sec)', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-b)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{deviceName(s.userAgent, t)}</span>
                    {s.current && <PTag label={t('security.thisDevice')} color="green" />}
                  </div>
                  <div style={{ ...mutedStyle, fontSize: 12, marginTop: 3 }}>
                    {s.ip ? t('security.ip', { ip: s.ip }) : ''}{t('security.meta', { created: fmtDateTime(s.createdAt, locale), expires: fmtDate(s.expiresAt, undefined, locale) })}
                  </div>
                </div>
                <PBtn variant="secondary" small disabled={busy} onClick={() => setTarget({ kind: 'one', row: s })}>{t('security.closeSession')}</PBtn>
              </li>
            ))}
          </ul>
        )}
        {notice && <Notice tone={notice.tone} style={{ marginTop: 14 }}>{notice.text}</Notice>}
      </Section>

      <Section title={t('security.howTitle')}>
        <p style={bodyStyle}>
          {t('security.howText')}
        </p>
      </Section>

      <ConfirmDialog
        open={target !== null}
        onClose={() => !busy && setTarget(null)}
        onConfirm={() => void confirm()}
        busy={busy}
        title={target?.kind === 'others' ? t('security.confirmOthersTitle') : target?.row.current ? t('security.confirmThisTitle') : t('security.closeSession')}
        confirmLabel={target?.kind === 'others' ? t(others === 1 ? 'security.confirmCountOne' : 'security.confirmCountOther', { count: others }) : t('security.closeSession')}
      >
        {target?.kind === 'others'
          ? t('security.othersText')
          : target?.row.current
            ? t('security.thisText')
            : t('security.oneText', { device: deviceName(target?.row.userAgent ?? null, t) })}
      </ConfirmDialog>
    </div>
  );
}
