import { useState, type ChangeEvent } from 'react';
import { api } from '~/lib/api/client';
import { mediaUrl } from '~/lib/catalog';
import { useMobile } from '~/hooks/useMobile';
import { downloadFile, ensureOk, errorText, postForm, unwrap } from './api';
import { fmtBytes, fmtDate } from './format';
import { DOC_KIND } from './labels';
import { checkFile, DOC_KINDS, documentSchema, validate, type FieldErrors } from './schemas';
import { errText, linkBtn, sub } from './styles';
import type { AdminAssetDetail, DocumentKind } from './types';
import { Btn, Field, FormGrid, Notice, Panel, Select, TextInput } from './ui';
import { useConfirm } from './useConfirm';

const fileButton = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 11, fontFamily: 'var(--font-b)', fontSize: 13,
  fontWeight: 600, cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text)', whiteSpace: 'nowrap',
} as const;

const iconBtn = {
  width: 30, height: 30, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  cursor: 'pointer', fontSize: 14, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
} as const;

/** Gallery of an asset: upload (PNG/JPG/WebP ≤ 5 MB), reorder (first = cover) and delete. */
export function ImagesPanel({ asset, onChanged }: { asset: AdminAssetDetail; onChanged: () => void }) {
  const mobile = useMobile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const images = [...asset.images].sort((a, b) => a.position - b.position);
  const id = asset.id;

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  function upload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    for (const f of files) {
      const problem = checkFile(f, 'image');
      if (problem) return setError(`${f.name}: ${problem}`);
    }
    void run(async () => {
      for (const f of files) {
        const form = new FormData();
        form.append('file', f);
        await postForm(`/v1/admin/assets/${id}/images`, form, 'No se pudo subir la imagen.');
      }
    });
  }

  function move(index: number, delta: -1 | 1) {
    const ids = images.map(i => i.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void run(async () => {
      await unwrap(api.PUT('/v1/admin/assets/{id}/images/order', { params: { path: { id } }, body: { ids } }), 'No se pudo reordenar.');
    });
  }

  async function remove(imageId: string, n: number) {
    const ok = await confirm({ title: 'Eliminar imagen', message: `Se eliminará la imagen ${n} de "${asset.name}". No se puede deshacer.`, confirmLabel: 'Eliminar', danger: true });
    if (ok) await run(() => ensureOk(api.DELETE('/v1/admin/assets/{id}/images/{imageId}', { params: { path: { id, imageId } } }), 'No se pudo eliminar la imagen.'));
  }

  return (
    <Panel
      title={`Imágenes (${images.length})`}
      action={
        <label style={{ ...fileButton, opacity: busy ? 0.5 : 1, pointerEvents: busy ? 'none' : 'auto' }}>
          {busy ? 'Procesando…' : '+ Subir imágenes'}
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={upload} disabled={busy} className="sr-only" />
        </label>
      }
    >
      {images.length === 0 && <div style={sub}>Sin imágenes. La primera imagen es la portada del activo en el catálogo.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        {images.map((img, i) => (
          <figure key={img.id} style={{ margin: 0, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-l)', background: 'var(--surface2)' }}>
            <div style={{ position: 'relative', aspectRatio: '4 / 3' }}>
              <img src={mediaUrl(img.url)} alt={`Imagen ${i + 1} de ${asset.name}`} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              {i === 0 && <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 9px', borderRadius: 999, background: 'rgba(10,12,16,0.78)', color: '#fff', fontFamily: 'var(--font-b)', fontSize: 10.5, fontWeight: 600 }}>Portada</span>}
            </div>
            <figcaption style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '8px' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" style={iconBtn} disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Mover imagen ${i + 1} antes`}>←</button>
                <button type="button" style={iconBtn} disabled={busy || i === images.length - 1} onClick={() => move(i, 1)} aria-label={`Mover imagen ${i + 1} después`}>→</button>
              </div>
              <button type="button" style={{ ...iconBtn, color: 'var(--neg)' }} disabled={busy} onClick={() => void remove(img.id, i + 1)} aria-label={`Eliminar imagen ${i + 1}`}>×</button>
            </figcaption>
          </figure>
        ))}
      </div>
      {error && <div style={{ ...errText, marginTop: 10 }}>{error}</div>}
      {dialog}
    </Panel>
  );
}

/** Investor documents of an asset: upload with title + kind (PDF/imagen ≤ 10 MB), download and delete. */
export function DocumentsPanel({ asset, onChanged }: { asset: AdminAssetDetail; onChanged: () => void }) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<DocumentKind>('legal');
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const { confirm, dialog } = useConfirm();
  const id = asset.id;

  async function upload() {
    setNotice(null);
    const v = validate(documentSchema, { title, kind });
    const fileError = file ? checkFile(file, 'document') : 'Elegí un archivo.';
    if (!v.ok || fileError || !file) {
      setErrors({ ...(v.ok ? {} : v.errors), ...(fileError ? { file: fileError } : {}) });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const form = new FormData();
      form.append('title', v.data.title);
      form.append('kind', v.data.kind);
      form.append('file', file);
      await postForm(`/v1/admin/assets/${id}/documents`, form, 'No se pudo subir el documento.');
      setTitle('');
      setFile(null);
      setInputKey(k => k + 1);
      setNotice({ tone: 'ok', text: 'Documento subido.' });
      onChanged();
    } catch (e) {
      setNotice({ tone: 'error', text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(docId: string, docTitle: string) {
    const ok = await confirm({ title: 'Eliminar documento', message: `Se eliminará "${docTitle}". Los inversores dejarán de verlo.`, confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    setNotice(null);
    try {
      await ensureOk(api.DELETE('/v1/admin/assets/{id}/documents/{docId}', { params: { path: { id, docId } } }), 'No se pudo eliminar el documento.');
      onChanged();
    } catch (e) {
      setNotice({ tone: 'error', text: errorText(e) });
    }
  }

  async function download(url: string, filename: string) {
    try {
      await downloadFile(url, filename);
    } catch (e) {
      setNotice({ tone: 'error', text: errorText(e, 'No se pudo descargar el archivo.') });
    }
  }

  return (
    <Panel title={`Documentos (${asset.documents.length})`}>
      {asset.documents.length === 0 && <div style={{ ...sub, marginBottom: 12 }}>Sin documentos.</div>}
      {asset.documents.map((d, i) => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < asset.documents.length - 1 ? '1px solid var(--border-l)' : 'none', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{d.title}</div>
            <div style={{ ...sub, marginTop: 2 }}>{DOC_KIND[d.kind]} · {d.filename} · {fmtBytes(d.size)} · {fmtDate(d.createdAt)}</div>
          </div>
          <button type="button" style={linkBtn} onClick={() => void download(d.url, d.filename)}>Descargar</button>
          <button type="button" style={{ ...linkBtn, color: 'var(--neg)' }} onClick={() => void remove(d.id, d.title)}>Eliminar</button>
        </div>
      ))}
      <form style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={e => { e.preventDefault(); void upload(); }}>
        <FormGrid>
          <Field label="Título" error={errors.title}>
            <TextInput value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder="Ej.: Escritura del inmueble" invalid={Boolean(errors.title)} />
          </Field>
          <Field label="Tipo" error={errors.kind}>
            <Select value={kind} onChange={e => setKind(e.target.value as DocumentKind)}>
              {DOC_KINDS.map(k => <option key={k} value={k}>{DOC_KIND[k]}</option>)}
            </Select>
          </Field>
          <Field label="Archivo (PDF, PNG, JPG o WebP, hasta 10 MB)" error={errors.file} span>
            <input key={inputKey} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }} />
          </Field>
        </FormGrid>
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        <div><Btn small variant="accent" type="submit" disabled={busy}>{busy ? 'Subiendo…' : 'Subir documento'}</Btn></div>
      </form>
      {dialog}
    </Panel>
  );
}
