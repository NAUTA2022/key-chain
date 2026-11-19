import { useId, useState } from 'react';
import { PBtn, PCard } from '~/components/ui';
import { api, apiUrl, authHeaders } from '~/lib/api/client';
import { call, errorText, fmtDate, saveBlob } from './api';
import { useMe, type Me, type Preferences } from './hooks';
import { Field, Modal, Notice, Skeleton, TextArea, TextInput, Toggle } from './kit';
import { deletionReason } from './schema';
import GuideResetCard from '~/features/guide/GuideResetCard';

// Privacidad (live): notification/visibility preferences (PATCH /v1/me), data export
// (GET /v1/me/export) and the account-closure request (POST /v1/me/deletion-request).

/** On/off preferences (excludes lists such as `guidesSeen`). */
type TogglePref = { [K in keyof Preferences]: Preferences[K] extends boolean ? K : never }[keyof Preferences];

const PREFS: ReadonlyArray<readonly [TogglePref, string, string]> = [
  ['investmentAlerts', 'Alertas de inversión', 'Avisos sobre tus inversiones: dividendos, liquidaciones y novedades de tus activos'],
  ['productUpdates', 'Novedades de la plataforma', 'Cambios importantes y nuevas funciones de La 33'],
  ['marketingEmails', 'Comunicaciones de marketing', 'Noticias, lanzamientos y promociones por email'],
  ['publicProfile', 'Perfil público', 'Mostrar tu nombre y foto a otros inversores'],
  ['showInvestments', 'Mostrar mis inversiones en mi perfil público', 'Otros inversores ven en qué proyectos invertiste (nunca los montos)'],
];

export default function PrivacyTab() {
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
      setPrefError(errorText(e, 'No pudimos guardar tu preferencia. Probá de nuevo.'));
    }
  }

  async function exportData() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(apiUrl('/v1/me/export'), { credentials: 'include', headers: authHeaders() });
      if (!res.ok) throw new Error(String(res.status));
      saveBlob(await res.blob(), 'keychain-datos.json');
    } catch {
      setExportError('No pudimos generar la descarga. Probá de nuevo en unos minutos.');
    }
    setExporting(false);
  }

  const requestedAt = me?.deletionRequestedAt ?? null;

  return (
    <div>
      <PCard style={{ padding: '22px 24px', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>Privacidad y datos</h3>
        {loading && !me ? (
          <Skeleton rows={4} height={30} />
        ) : error && !me ? (
          <Notice tone="error">No pudimos cargar tus preferencias.</Notice>
        ) : me ? (
          PREFS.map(([key, label, desc], i) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '13px 0', borderBottom: i < PREFS.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 3 }}>{desc}</div>
              </div>
              <Toggle checked={me.preferences[key]} label={label} disabled={saving === key} onChange={v => void toggle(key, v)} />
            </div>
          ))
        ) : null}
        {prefError && <Notice tone="error" style={{ marginTop: 12 }}>{prefError}</Notice>}
      </PCard>

      <GuideResetCard />

      <PCard style={{ padding: '22px 24px', border: '1.5px solid var(--neg)' }}>
        <h3 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--neg)', marginBottom: 6 }}>Zona de peligro</h3>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', marginBottom: 16 }}>Descargá una copia de tus datos o pedí el cierre de tu cuenta. El cierre no se puede deshacer una vez procesado.</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <PBtn variant="secondary" small disabled={exporting} style={{ borderColor: 'var(--neg)', color: 'var(--neg)' }} onClick={() => void exportData()}>{exporting ? 'Preparando…' : 'Descargar mis datos'}</PBtn>
          <PBtn variant="secondary" small disabled={!me || Boolean(requestedAt)} style={{ borderColor: 'var(--neg)', color: 'var(--neg)' }} onClick={() => setClosing(true)}>
            {requestedAt ? 'Cierre solicitado' : 'Solicitar cierre de cuenta'}
          </PBtn>
        </div>
        {exportError && <Notice tone="error" style={{ marginTop: 12 }}>{exportError}</Notice>}
        {notice ? (
          <Notice tone="success" style={{ marginTop: 12 }}>{notice}</Notice>
        ) : requestedAt ? (
          <Notice tone="info" style={{ marginTop: 12 }}>Pediste el cierre de tu cuenta el {fmtDate(requestedAt)}. El equipo lo está procesando.</Notice>
        ) : null}
      </PCard>

      <Modal open={closing} onClose={() => setClosing(false)} title="Solicitar cierre de cuenta" width={480}>
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
  const id = useId();
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmId = useId();
  const parsed = deletionReason.safeParse(reason);
  const armed = confirmText.trim().toUpperCase() === 'CERRAR';

  async function submit() {
    if (!parsed.success || !armed) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await call(api.POST('/v1/me/deletion-request', { body: parsed.data ? { reason: parsed.data } : {} }));
    setBusy(false);
    if (!data) return setError(errorText(e, 'No pudimos registrar tu solicitud. Probá de nuevo.'));
    onDone(data.notice, data.requestedAt);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.6 }}>
        El equipo va a revisar tu pedido y cerrar la cuenta. Antes de pedirlo, cobrá tus dividendos pendientes y descargá tus resúmenes: tus tokens siguen en tu wallet.
      </p>
      <Field label="Motivo (opcional)" htmlFor={id} error={parsed.success ? null : parsed.error.issues[0]?.message} hint={`${reason.length}/500`}>
        <TextArea id={id} rows={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Contanos por qué te vas (nos ayuda a mejorar)" />
      </Field>
      <Field label={<>Escribí <strong>CERRAR</strong> para confirmar</>} htmlFor={confirmId}>
        <TextInput id={confirmId} value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off" />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <PBtn variant="secondary" small onClick={onCancel} disabled={busy}>Cancelar</PBtn>
        <PBtn variant="primary" small disabled={busy || !armed || !parsed.success} onClick={() => void submit()} style={{ background: 'var(--neg)', color: '#fff' }}>
          {busy ? 'Enviando…' : 'Solicitar cierre'}
        </PBtn>
      </div>
    </div>
  );
}
