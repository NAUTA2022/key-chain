import { useState, type FormEvent } from 'react';
import { PCard } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { errorText, unwrap } from './api';
import { fmtInt } from './format';
import { AUDIENCE } from './labels';
import { AUDIENCES, broadcastSchema, validate, type FieldErrors } from './schemas';
import { body, sub } from './styles';
import type { BroadcastAudience } from './types';
import { Btn, Field, Notice, Panel, Select, TextArea, TextInput } from './ui';
import { useConfirm } from './useConfirm';

type Form = { title: string; body: string; link: string; audience: BroadcastAudience };
const EMPTY: Form = { title: '', body: '', link: '', audience: 'all' };

/** "Notificaciones": in-app broadcast to an audience (blocked users are never notified). */
export function BroadcastTab() {
  const mobile = useMobile();
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const { confirm, dialog } = useConfirm();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF(prev => ({ ...prev, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNote(null);
    const v = validate(broadcastSchema, { title: f.title, body: f.body, link: f.link.trim() || undefined, audience: f.audience });
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    const ok = await confirm({
      title: 'Enviar notificación',
      message: <>Se enviará <strong>“{v.data.title}”</strong> a: {AUDIENCE[v.data.audience]}. Llega a la campana de cada usuario y no se puede deshacer.</>,
      confirmLabel: 'Enviar',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await unwrap(api.POST('/v1/admin/notifications', { body: v.data }), 'No se pudo enviar la notificación.');
      setF(EMPTY);
      setNote({ tone: 'ok', text: `Notificación enviada a ${fmtInt(r.recipients)} destinatario${r.recipients === 1 ? '' : 's'}.` });
    } catch (err) {
      setNote({ tone: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'minmax(0, 3fr) minmax(0, 2fr)', gap: 16, alignItems: 'start' }}>
      <Panel title="Notificación masiva">
        <form onSubmit={e => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
          <Field label="Título" error={errors.title}>
            <TextInput value={f.title} onChange={e => set('title', e.target.value)} maxLength={120} invalid={Boolean(errors.title)} />
          </Field>
          <Field label="Mensaje" error={errors.body} hint={`${f.body.length}/1000`}>
            <TextArea value={f.body} onChange={e => set('body', e.target.value)} maxLength={1000} rows={5} invalid={Boolean(errors.body)} />
          </Field>
          <Field label="Enlace interno (opcional)" error={errors.link} hint="Ruta de la plataforma, por ejemplo /pertenencias o /tokenizaciones/12.">
            <TextInput value={f.link} onChange={e => set('link', e.target.value)} maxLength={300} placeholder="/…" invalid={Boolean(errors.link)} />
          </Field>
          <Field label="Destinatarios" error={errors.audience}>
            <Select value={f.audience} onChange={e => set('audience', e.target.value as BroadcastAudience)}>
              {AUDIENCES.map(a => <option key={a} value={a}>{AUDIENCE[a]}</option>)}
            </Select>
          </Field>
          {note && <Notice tone={note.tone}>{note.text}</Notice>}
          <div><Btn variant="accent" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar notificación'}</Btn></div>
        </form>
      </Panel>
      <Panel title="Vista previa">
        <PCard style={{ padding: '14px 16px', boxShadow: 'none' }}>
          <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)', overflowWrap: 'anywhere' }}>{f.title.trim() || 'Título de la notificación'}</div>
          <div style={{ ...body, fontSize: 12.5, marginTop: 4, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{f.body.trim() || 'El mensaje aparece acá.'}</div>
          {f.link.trim() && <div style={{ ...sub, marginTop: 8 }}>Abre {f.link.trim()}</div>}
        </PCard>
        <div style={{ ...sub, marginTop: 12, lineHeight: 1.5 }}>Los usuarios bloqueados nunca reciben notificaciones. “Inversores” son quienes tienen al menos una inversión acreditada on-chain.</div>
      </Panel>
      {dialog}
    </div>
  );
}
