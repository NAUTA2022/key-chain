import { useState, type FormEvent } from 'react';
import { PCard, PTag } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { ensureOk, errorText, unwrap, useApiData } from './api';
import { faqSchema, validate, type FieldErrors } from './schemas';
import { body, errText, strong, sub, toolbar } from './styles';
import type { Faq } from './types';
import { Btn, Check, Drawer, Field, FormGrid, ListNote, Notice, TextArea, TextInput } from './ui';
import { useConfirm } from './useConfirm';

const arrowBtn = {
  width: 30, height: 30, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  cursor: 'pointer', fontSize: 13, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
} as const;

/** FAQ: create/edit/delete, publish toggle and display order (up/down). */
export function FaqAdmin() {
  const mobile = useMobile();
  const list = useApiData('faq', () => unwrap(api.GET('/v1/admin/faq'), 'No se pudieron cargar las preguntas.'));
  const [ordered, setOrdered] = useState<{ stamp: string | null; items: Faq[] } | null>(null);
  const [editing, setEditing] = useState<{ key: string; faq: Faq | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  // A reorder response replaces the list until the next reload.
  const items = ordered && ordered.stamp === list.stamp ? ordered.items : [...(list.data ?? [])].sort((a, b) => a.position - b.position);
  const categories = [...new Set(items.map(f => f.category))].sort();

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const ids = items.map(f => f.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    setError(null);
    try {
      const next = await unwrap(api.PUT('/v1/admin/faq/order', { body: { ids } }), 'No se pudo reordenar.');
      setOrdered({ stamp: list.stamp, items: [...next].sort((a, b) => a.position - b.position) });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(f: Faq) {
    if (!(await confirm({ title: 'Eliminar pregunta', message: `Se eliminará "${f.question}". No se puede deshacer.`, confirmLabel: 'Eliminar', danger: true }))) return;
    setBusy(true);
    setError(null);
    try {
      await ensureOk(api.DELETE('/v1/admin/faq/{id}', { params: { path: { id: f.id } } }), 'No se pudo eliminar la pregunta.');
      list.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ ...toolbar, justifyContent: 'space-between' }}>
        <span style={sub}>{items.length} pregunta{items.length === 1 ? '' : 's'} · el orden es el de la página de ayuda.</span>
        <Btn variant="accent" onClick={() => setEditing({ key: `new-${Date.now()}`, faq: null })}>+ Nueva pregunta</Btn>
      </div>
      {error && <div style={{ ...errText, marginBottom: 10 }}>{error}</div>}
      <PCard style={{ padding: '8px 16px' }}>
        <ListNote loading={list.loading} error={list.error} empty={items.length === 0} emptyText="Todavía no hay preguntas frecuentes." />
        {items.map((f, i) => (
          <div key={f.id} style={{ display: 'flex', alignItems: mobile ? 'flex-start' : 'center', gap: 12, padding: '14px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border-l)' : 'none', flexDirection: mobile ? 'column' : 'row' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" style={arrowBtn} disabled={busy || i === 0} onClick={() => void move(i, -1)} aria-label={`Subir "${f.question}"`}>↑</button>
              <button type="button" style={arrowBtn} disabled={busy || i === items.length - 1} onClick={() => void move(i, 1)} aria-label={`Bajar "${f.question}"`}>↓</button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={strong}>{f.question}</div>
              <div style={{ ...body, fontSize: 12.5, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.answer}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <PTag label={f.category} color="neutral" />
                <PTag label={f.published ? 'Publicada' : 'Oculta'} color={f.published ? 'green' : 'dark'} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn small variant="ghost" onClick={() => setEditing({ key: f.id, faq: f })}>Editar</Btn>
              <Btn small variant="secondary" disabled={busy} onClick={() => void remove(f)}>Eliminar</Btn>
            </div>
          </div>
        ))}
      </PCard>
      {editing && <FaqDrawer key={editing.key} faq={editing.faq} categories={categories} onClose={() => setEditing(null)} onSaved={() => list.reload()} />}
      {dialog}
    </>
  );
}

type FaqForm = { question: string; answer: string; category: string; published: boolean };

function FaqDrawer({ faq, categories, onClose, onSaved }: { faq: Faq | null; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const [current, setCurrent] = useState(faq);
  const [f, setF] = useState<FaqForm>(() => (faq ? { question: faq.question, answer: faq.answer, category: faq.category, published: faq.published } : { question: '', answer: '', category: 'general', published: true }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const set = <K extends keyof FaqForm>(k: K, v: FaqForm[K]) => setF(prev => ({ ...prev, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNote(null);
    const v = validate(faqSchema, f);
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      const saved = current
        ? await unwrap(api.PATCH('/v1/admin/faq/{id}', { params: { path: { id: current.id } }, body: v.data }), 'No se pudieron guardar los cambios.')
        : await unwrap(api.POST('/v1/admin/faq', { body: v.data }), 'No se pudo crear la pregunta.');
      setCurrent(saved);
      setNote({ tone: 'ok', text: current ? 'Cambios guardados.' : 'Pregunta creada.' });
      onSaved();
    } catch (err) {
      setNote({ tone: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer title={current ? 'Editar pregunta' : 'Nueva pregunta'} onClose={onClose} width={600}>
      <form onSubmit={e => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
        <Field label="Pregunta" error={errors.question}>
          <TextInput value={f.question} onChange={e => set('question', e.target.value)} maxLength={300} invalid={Boolean(errors.question)} />
        </Field>
        <Field label="Respuesta" error={errors.answer}>
          <TextArea value={f.answer} onChange={e => set('answer', e.target.value)} maxLength={5000} rows={7} invalid={Boolean(errors.answer)} />
        </Field>
        <FormGrid>
          <Field label="Categoría" error={errors.category}>
            <TextInput value={f.category} onChange={e => set('category', e.target.value)} maxLength={40} list="admin-faq-categories" invalid={Boolean(errors.category)} />
          </Field>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
            <Check checked={f.published} onChange={v => set('published', v)} label="Publicada en Ayuda" />
          </div>
        </FormGrid>
        <datalist id="admin-faq-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
        {note && <Notice tone={note.tone}>{note.text}</Notice>}
        <div><Btn variant="accent" type="submit" disabled={busy}>{busy ? 'Guardando…' : current ? 'Guardar cambios' : 'Crear pregunta'}</Btn></div>
      </form>
    </Drawer>
  );
}
