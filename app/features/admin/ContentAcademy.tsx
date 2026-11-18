import { useState, type ChangeEvent, type FormEvent } from 'react';
import { PTag } from '~/components/ui';
import { api } from '~/lib/api/client';
import { mediaUrl } from '~/lib/catalog';
import { errorText, postForm, unwrap, useApiData } from './api';
import { fmtDate, localInputToIso, toLocalInput, toNumber } from './format';
import { ASSET_STATUS } from './labels';
import { checkFile, createPostSchema, PUBLICATION_STATUSES, updatePostSchema, validate, type FieldErrors } from './schemas';
import { strong, sub, td, tdDim, toolbar } from './styles';
import type { AcademyPost, PublicationStatus } from './types';
import { Btn, Check, Chips, DataTable, Drawer, Field, FormGrid, Notice, Panel, Row, Select, Tag, TextArea, TextInput } from './ui';
import { useConfirm } from './useConfirm';

type Filter = 'all' | PublicationStatus;
const FILTERS: Array<[Filter, string]> = [['all', 'Todos'], ['draft', 'Borradores'], ['review', 'En revisión'], ['published', 'Publicados'], ['archived', 'Archivados']];

/** Academia: posts of every status, editor with cover upload, archive. */
export function AcademyAdmin() {
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<AcademyPost | 'new' | null>(null);
  const list = useApiData('posts', () => unwrap(api.GET('/v1/admin/academy/posts'), 'No se pudieron cargar los artículos.'));
  const posts = (list.data ?? []).filter(p => filter === 'all' || p.status === filter);
  const categories = [...new Set((list.data ?? []).map(p => p.category))].sort();

  return (
    <>
      <div style={{ ...toolbar, justifyContent: 'space-between' }}>
        <Chips<Filter> ariaLabel="Filtrar artículos por estado" options={FILTERS} value={filter} onChange={setFilter} />
        <Btn variant="accent" onClick={() => setEditing('new')}>+ Nuevo artículo</Btn>
      </div>
      <DataTable
        head={['Artículo', 'Categoría', 'Estado', 'Publicación', 'Lectura', '']}
        minWidth={820}
        loading={list.loading} error={list.error} empty={posts.length === 0} emptyText="No hay artículos en este estado."
      >
        {posts.map((p, i) => (
          <Row key={p.id} last={i === posts.length - 1}>
            <td style={td}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={mediaUrl(p.coverUrl)} alt="" width={44} height={32} style={{ width: 44, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={strong}>{p.title}{p.featured && <span style={{ marginLeft: 6 }}><PTag label="Destacado" color="purple" /></span>}</div>
                  <div style={{ ...sub, marginTop: 2 }}>/academia/{p.slug}</div>
                </div>
              </div>
            </td>
            <td style={td}><PTag label={p.category} color="neutral" /></td>
            <td style={td}><Tag spec={ASSET_STATUS[p.status]} /></td>
            <td style={tdDim}>{fmtDate(p.publishedAt)}</td>
            <td style={tdDim}>{p.readMinutes} min</td>
            <td style={td}><Btn small variant="ghost" onClick={() => setEditing(p)}>Editar</Btn></td>
          </Row>
        ))}
      </DataTable>
      {editing && (
        <PostDrawer
          key={editing === 'new' ? 'new' : editing.id}
          post={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => list.reload()}
        />
      )}
    </>
  );
}

type Note = { tone: 'ok' | 'error'; text: string } | null;

type PostForm = {
  title: string; slug: string; excerpt: string; body: string; category: string; coverUrl: string;
  readMinutes: string; featured: boolean; status: PublicationStatus; publishedAt: string;
};

function toForm(p: AcademyPost | null): PostForm {
  return p
    ? { title: p.title, slug: p.slug, excerpt: p.excerpt, body: p.body ?? '', category: p.category, coverUrl: p.coverUrl, readMinutes: String(p.readMinutes), featured: p.featured, status: p.status, publishedAt: toLocalInput(p.publishedAt) }
    : { title: '', slug: '', excerpt: '', body: '', category: '', coverUrl: '', readMinutes: '5', featured: false, status: 'draft', publishedAt: '' };
}

const STATUS_LABEL: Record<PublicationStatus, string> = { draft: 'Borrador', review: 'En revisión', published: 'Publicado', archived: 'Archivado' };

/** `post` is only the starting point: the drawer keeps its own copy as it saves. */
function PostDrawer({ post, categories, onClose, onSaved }: { post: AcademyPost | null; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const [current, setCurrent] = useState(post);
  const [initial, setInitial] = useState(() => toForm(post));
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const { confirm, dialog } = useConfirm();
  const set = <K extends keyof PostForm>(k: K, v: PostForm[K]) => setF(prev => ({ ...prev, [k]: v }));

  function saved(p: AcademyPost, text: string) {
    const next = toForm(p);
    setCurrent(p);
    setInitial(next);
    setF(next);
    setNote({ tone: 'ok', text });
    onSaved();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNote(null);
    const publishedAt = f.publishedAt ? localInputToIso(f.publishedAt) ?? 'invalid' : undefined;
    const full = {
      title: f.title, excerpt: f.excerpt, category: f.category, readMinutes: toNumber(f.readMinutes), featured: f.featured, status: f.status,
      body: f.body.trim() ? f.body : null,
      slug: f.slug.trim() || undefined, coverUrl: f.coverUrl.trim() || undefined, publishedAt,
    };
    if (!current) {
      const v = validate(createPostSchema, full);
      if (!v.ok) return setErrors(v.errors);
      setErrors({});
      setBusy(true);
      try {
        saved(await unwrap(api.POST('/v1/admin/academy/posts', { body: v.data }), 'No se pudo crear el artículo.'), 'Artículo creado. Ya podés subir la portada.');
      } catch (err) {
        setNote({ tone: 'error', text: errorText(err) });
      } finally {
        setBusy(false);
      }
      return;
    }
    // Only the fields the admin touched.
    const changed = (Object.keys(f) as Array<keyof PostForm>).filter(k => f[k] !== initial[k]);
    if (changed.length === 0) return setNote({ tone: 'ok', text: 'No hay cambios para guardar.' });
    const patch = Object.fromEntries(changed.map(k => [k, k === 'readMinutes' ? full.readMinutes : k === 'body' ? full.body : k === 'publishedAt' ? publishedAt : full[k]]));
    const v = validate(updatePostSchema, patch);
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      saved(await unwrap(api.PATCH('/v1/admin/academy/posts/{id}', { params: { path: { id: current.id } }, body: v.data }), 'No se pudieron guardar los cambios.'), 'Cambios guardados.');
    } catch (err) {
      setNote({ tone: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function uploadCover(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !current) return;
    const problem = checkFile(file, 'image');
    if (problem) return setNote({ tone: 'error', text: problem });
    setBusy(true);
    setNote(null);
    try {
      const form = new FormData();
      form.append('file', file);
      await postForm(`/v1/admin/academy/posts/${current.id}/cover`, form, 'No se pudo subir la portada.');
      const fresh = (await unwrap(api.GET('/v1/admin/academy/posts'))).find(p => p.id === current.id);
      if (fresh) saved(fresh, 'Portada actualizada.');
    } catch (err) {
      setNote({ tone: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!current) return;
    if (!(await confirm({ title: 'Archivar artículo', message: `"${current.title}" dejará de mostrarse en la Academia.`, confirmLabel: 'Archivar', danger: true }))) return;
    setBusy(true);
    setNote(null);
    try {
      saved(await unwrap(api.DELETE('/v1/admin/academy/posts/{id}', { params: { path: { id: current.id } } }), 'No se pudo archivar el artículo.'), 'Artículo archivado.');
    } catch (err) {
      setNote({ tone: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer title={current ? current.title : 'Nuevo artículo'} subtitle={current ? <Tag spec={ASSET_STATUS[current.status]} /> : 'La portada se sube después de crear el artículo.'} onClose={onClose}>
      {current && (
        <Panel
          title="Portada"
          action={
            <label style={{ display: 'inline-flex', padding: '9px 16px', borderRadius: 11, fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', background: 'var(--surface2)', color: 'var(--text)', opacity: busy ? 0.5 : 1 }}>
              Subir imagen
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void uploadCover(e)} disabled={busy} className="sr-only" />
            </label>
          }
        >
          <img src={mediaUrl(current.coverUrl)} alt={`Portada de ${current.title}`} style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
        </Panel>
      )}
      <Panel title="Contenido">
        <form onSubmit={e => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
          <FormGrid>
            <Field label="Título" error={errors.title} span>
              <TextInput value={f.title} onChange={e => set('title', e.target.value)} maxLength={200} invalid={Boolean(errors.title)} />
            </Field>
            <Field label="Slug" error={errors.slug} hint={current ? undefined : 'Opcional: se genera desde el título.'}>
              <TextInput value={f.slug} onChange={e => set('slug', e.target.value.toLowerCase())} maxLength={120} placeholder="que-es-la-tokenizacion" invalid={Boolean(errors.slug)} />
            </Field>
            <Field label="Categoría" error={errors.category}>
              <TextInput value={f.category} onChange={e => set('category', e.target.value)} maxLength={40} list="admin-post-categories" invalid={Boolean(errors.category)} />
            </Field>
            <Field label="Bajada" error={errors.excerpt} span>
              <TextArea value={f.excerpt} onChange={e => set('excerpt', e.target.value)} maxLength={500} rows={2} invalid={Boolean(errors.excerpt)} />
            </Field>
            <Field label="Cuerpo (Markdown)" error={errors.body} span hint="Opcional mientras sea borrador.">
              <TextArea value={f.body} onChange={e => set('body', e.target.value)} maxLength={100_000} rows={12} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }} invalid={Boolean(errors.body)} />
            </Field>
            <Field label="Estado" error={errors.status}>
              <Select value={f.status} onChange={e => set('status', e.target.value as PublicationStatus)}>
                {PUBLICATION_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </Select>
            </Field>
            <Field label="Fecha de publicación" error={errors.publishedAt} hint={current ? undefined : 'Vacío = ahora.'}>
              <TextInput type="datetime-local" value={f.publishedAt} onChange={e => set('publishedAt', e.target.value)} invalid={Boolean(errors.publishedAt)} />
            </Field>
            <Field label="Minutos de lectura" error={errors.readMinutes}>
              <TextInput type="number" inputMode="numeric" min="1" max="240" step="1" value={f.readMinutes} onChange={e => set('readMinutes', e.target.value)} invalid={Boolean(errors.readMinutes)} />
            </Field>
            <Field label="URL de portada" error={errors.coverUrl} hint="Ruta relativa (/…) o https. También podés subir una imagen.">
              <TextInput value={f.coverUrl} onChange={e => set('coverUrl', e.target.value)} maxLength={500} invalid={Boolean(errors.coverUrl)} />
            </Field>
          </FormGrid>
          <Check checked={f.featured} onChange={v => set('featured', v)} label="Destacado en la Academia" />
          <datalist id="admin-post-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
          {Object.keys(errors).length > 0 && <Notice tone="error">Revisá los campos marcados.</Notice>}
          {note && <Notice tone={note.tone}>{note.text}</Notice>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="accent" type="submit" disabled={busy}>{busy ? 'Guardando…' : current ? 'Guardar cambios' : 'Crear artículo'}</Btn>
            {current && current.status !== 'archived' && <Btn variant="secondary" disabled={busy} onClick={() => void archive()}>Archivar</Btn>}
          </div>
        </form>
      </Panel>
      {dialog}
    </Drawer>
  );
}
