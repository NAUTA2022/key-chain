import { useId, useState } from 'react';
import { PBtn, PCard } from '~/components/ui';
import { api, apiUrl, authHeaders } from '~/lib/api/client';
import { call, errorText, fmtDate, saveBlob } from './api';
import { useMe, type Me, type Preferences } from './hooks';
import { Field, Modal, Notice, Skeleton, TextArea, TextInput, Toggle } from './kit';
import { deletionReason } from './schema';
import GuideResetCard from '~/features/guide/GuideResetCard';
import { useT } from '~/i18n/useT';

// Privacidad (live): notification/visibility preferences (PATCH /v1/me), data export
// (GET /v1/me/export) and the account-closure request (POST /v1/me/deletion-request).

/** On/off preferences (excludes lists such as `guidesSeen`). */
type TogglePref = { [K in keyof Preferences]: Preferences[K] extends boolean ? K : never }[keyof Preferences];

/** Preference ids; label and description come from `privacy.prefs.<id>`. */
const PREFS: readonly TogglePref[] = ['investmentAlerts', 'productUpdates', 'marketingEmails', 'publicProfile', 'showInvestments'];

export default function PrivacyTab() {
  const { t, locale } = useT('profile');
  const { data: me, loading, error, mutate } = useMe();
  const [saving, setSaving] = useState<TogglePref | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function toggle(key: TogglePref, value: boolean) {
    if (!me) return;
    const previous = me;
    mutate({ ...me, preferences: { ...me.preferences, [key]: value } });
    setSaving(key);
    setPrefError(null);
    const { data, error: e } = await call(api.PATCH('/v1/me', { body: { preferences: { [key]: value } } }));
    setSaving(null);
    if (data) mutate(data);
    else {
      mutate(previous);
      setPrefError(errorText(e, t('privacy.saveError'), {}, t));
    }
  }

  async function exportData() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(apiUrl('/v1/me/export'), { credentials: 'include', headers: authHeaders() });
      if (!res.ok) throw new Error(String(res.status));
      saveBlob(await res.blob(), t('privacy.exportFileName'));
    } catch {
      setExportError(t('privacy.exportError'));
    }
    setExporting(false);
  }

  const requestedAt = me?.deletionRequestedAt ?? null;

  return (
    <div>
      <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>{t('privacy.title')}</h3>
        {loading && !me ? (
          <Skeleton rows={4} height={30} />
        ) : error && !me ? (
          <Notice tone="error">{t('privacy.loadError')}</Notice>
        ) : me ? (
          PREFS.map((key, i) => {
            const label = t(`privacy.prefs.${key}.label`);
            return (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 0', borderBottom: i < PREFS.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 3 }}>{t(`privacy.prefs.${key}.desc`)}</div>
              </div>
              <Toggle checked={me.preferences[key]} label={label} disabled={saving === key} onChange={v => void toggle(key, v)} />
            </div>
            );
          })
        ) : null}
        {prefError && <Notice tone="error" style={{ marginTop: 12 }}>{prefError}</Notice>}
      </PCard>

      <GuideResetCard />

      <PCard style={{ padding: '22px 24px', border: '1.5px solid var(--neg)' }}>
        <h3 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--neg)', marginBottom: 6 }}>{t('privacy.dangerTitle')}</h3>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', marginBottom: 16 }}>{t('privacy.dangerText')}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <PBtn variant="secondary" small disabled={exporting} style={{ borderColor: 'var(--neg)', color: 'var(--neg)' }} onClick={() => void exportData()}>{exporting ? t('privacy.preparing') : t('privacy.download')}</PBtn>
          <PBtn variant="secondary" small disabled={!me || Boolean(requestedAt)} style={{ borderColor: 'var(--neg)', color: 'var(--neg)' }} onClick={() => setClosing(true)}>
            {requestedAt ? t('privacy.closureRequested') : t('privacy.requestClosure')}
          </PBtn>
        </div>
        {exportError && <Notice tone="error" style={{ marginTop: 12 }}>{exportError}</Notice>}
        {notice ? (
          <Notice tone="success" style={{ marginTop: 12 }}>{notice}</Notice>
        ) : requestedAt ? (
          <Notice tone="info" style={{ marginTop: 12 }}>{t('privacy.requestedOn', { date: fmtDate(requestedAt, undefined, locale) })}</Notice>
        ) : null}
      </PCard>

      <Modal open={closing} onClose={() => setClosing(false)} title={t('privacy.requestClosure')} width={480}>
        {closing && (
          <DeletionForm
            onCancel={() => setClosing(false)}
            onDone={(text, at) => {
              setClosing(false);
              setNotice(text);
              if (me) mutate({ ...me, deletionRequestedAt: at } satisfies Me);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function DeletionForm({ onCancel, onDone }: { onCancel: () => void; onDone: (notice: string, requestedAt: string) => void }) {
  const { t } = useT('profile');
  const id = useId();
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmId = useId();
  const parsed = deletionReason.safeParse(reason);
  const confirmWord = t('privacy.confirmWord');
  const armed = confirmText.trim().toUpperCase() === confirmWord.toUpperCase();

  async function submit() {
    if (!parsed.success || !armed) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await call(api.POST('/v1/me/deletion-request', { body: parsed.data ? { reason: parsed.data } : {} }));
    setBusy(false);
    if (!data) return setError(errorText(e, t('privacy.submitError'), {}, t));
    onDone(data.notice, data.requestedAt);
  }

  // "Escribe {{word}} para confirmar": the word is bold, so the label is split around it.
  const confirmLabel = t('privacy.confirmLabel').split('{{word}}');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.6 }}>
        {t('privacy.deletionIntro')}
      </p>
      <Field label={t('privacy.reasonLabel')} htmlFor={id} error={parsed.success ? null : t(parsed.error.issues[0]?.message ?? 'validation.max500')} hint={`${reason.length}/500`}>
        <TextArea id={id} rows={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder={t('privacy.reasonPlaceholder')} />
      </Field>
      <Field label={<>{confirmLabel[0]}<strong>{confirmWord}</strong>{confirmLabel[1]}</>} htmlFor={confirmId}>
        <TextInput id={confirmId} value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off" />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <PBtn variant="secondary" small onClick={onCancel} disabled={busy}>{t('privacy.cancel')}</PBtn>
        <PBtn variant="primary" small disabled={busy || !armed || !parsed.success} onClick={() => void submit()} style={{ background: 'var(--neg)', color: '#fff' }}>
          {busy ? t('privacy.sending') : t('privacy.submit')}
        </PBtn>
      </div>
    </div>
  );
}
