import { useRef, useState, type CSSProperties } from 'react';
import { Icons, PBtn, PCard, PTag } from '~/components/ui';
import { DOC_TYPES, IMAGE_TYPES, fmtSize, uploadFile } from '~/features/profile/api';
import { FileButton, Notice } from '~/features/profile/kit';
import { mutedStyle } from '~/features/profile/styles';
import { documentsPath, MAX_DOCUMENT_BYTES, MAX_DOCUMENTS, uploadErrorText, type RequestDocument, type TokenizationRequestDetail } from './api';
import { DOC_SLOTS, type DocSlotId } from './labels';

// Wizard step shown right after the request is created: every file is uploaded to
// POST /v1/tokenization-requests/{id}/documents as soon as it is picked.

type Upload = {
  key: number;
  slot: DocSlotId;
  file: File;
  status: 'uploading' | 'done' | 'error';
  doc?: RequestDocument;
  error?: string;
};

const SMALL: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', whiteSpace: 'nowrap' };
const LINK_BTN: CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--accent-text)' };

export default function DocumentsStep({ request, onFinish, isMobile }: { request: TokenizationRequestDetail; onFinish: () => void; isMobile: boolean }) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [slotErrors, setSlotErrors] = useState<Partial<Record<DocSlotId, string>>>({});
  const [announce, setAnnounce] = useState('');
  const seq = useRef(0);

  const used = request.documents.length + uploads.filter(u => u.status !== 'error').length;
  const full = used >= MAX_DOCUMENTS;
  const busy = uploads.some(u => u.status === 'uploading');
  const uploaded = uploads.filter(u => u.status === 'done').length;

  const send = async (key: number, file: File) => {
    const { data, error } = await uploadFile<RequestDocument>(documentsPath(request.id), file);
    const message = data ? null : uploadErrorText(error);
    setUploads(list => list.map((u): Upload => (u.key !== key ? u : data ? { ...u, status: 'done', doc: data, error: undefined } : { ...u, status: 'error', error: message ?? undefined })));
    setAnnounce(data ? `Subimos ${data.filename}.` : `No pudimos subir ${file.name}. ${message ?? ''}`);
  };

  const add = (slot: DocSlotId, file: File) => {
    if (full) return;
    seq.current += 1;
    const key = seq.current;
    setUploads(list => [...list, { key, slot, file, status: 'uploading' }]);
    setAnnounce(`Subiendo ${file.name}…`);
    void send(key, file);
  };

  const retry = (u: Upload) => {
    if (full) return;
    setUploads(list => list.map((x): Upload => (x.key === u.key ? { ...x, status: 'uploading', error: undefined } : x)));
    setAnnounce(`Subiendo ${u.file.name}…`);
    void send(u.key, u.file);
  };

  const discard = (key: number) => setUploads(list => list.filter(u => u.key !== key));

  return (
    <>
      <PCard style={{ padding: isMobile ? '18px 16px' : '24px', marginBottom: 16 }}>
        <Notice tone="success" style={{ marginBottom: 18 }}>
          Enviamos tu solicitud. Ahora subí la documentación del activo para que el equipo pueda revisarla.
        </Notice>
        <h2 data-step-title tabIndex={-1} style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6, outline: 'none' }}>Documentación del activo</h2>
        <p style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', lineHeight: 1.5, marginBottom: 8 }}>
          Cada archivo se sube al instante. PDF, PNG, JPG o WebP de hasta 10 MB, con un máximo de {MAX_DOCUMENTS} por solicitud. Usá nombres claros (por ejemplo, escritura.pdf): el equipo ve el nombre original del archivo.
        </p>

        <ul style={{ listStyle: 'none' }}>
          {DOC_SLOTS.map(slot => {
            const files = uploads.filter(u => u.slot === slot.id);
            const ok = files.some(f => f.status === 'done');
            const slotError = slotErrors[slot.id];
            return (
              <li key={slot.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border-l)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 14 }}>
                  <div aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, background: ok ? 'var(--accent-bg)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ok ? 'var(--accent-text)' : 'var(--ter)', flexShrink: 0 }}>
                    {ok ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    ) : (
                      Icons.doc
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{slot.label}</h3>
                    <p style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{slot.sub}</p>
                  </div>
                  <FileButton
                    label={
                      <>
                        {files.length ? 'Agregar' : 'Subir'}
                        <span className="sr-only">: {slot.label}</span>
                      </>
                    }
                    accept={slot.imagesOnly ? IMAGE_TYPES : DOC_TYPES}
                    maxBytes={MAX_DOCUMENT_BYTES}
                    onFile={f => add(slot.id, f)}
                    onError={m => setSlotErrors(s => ({ ...s, [slot.id]: m ?? undefined }))}
                    disabled={full}
                  />
                </div>
                {slotError && <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)', marginTop: 8 }}>{slotError}</div>}
                {files.length > 0 && (
                  <ul style={{ listStyle: 'none', marginTop: 10, paddingLeft: isMobile ? 0 : 54, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {files.map(u => (
                      <li key={u.key} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 12px', borderRadius: 10, background: 'var(--surface2)' }}>
                        <span title={u.doc?.filename ?? u.file.name} style={{ flex: '1 1 140px', minWidth: 0, fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.doc?.filename ?? u.file.name}
                        </span>
                        <span style={SMALL}>{fmtSize(u.doc?.size ?? u.file.size)}</span>
                        {u.status === 'uploading' && <span style={SMALL}>Subiendo…</span>}
                        {u.status === 'done' && <PTag label="Subido ✓" color="green" />}
                        {u.status === 'error' && (
                          <>
                            <span style={{ flexBasis: '100%', fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)' }}>{u.error}</span>
                            {!full && <button type="button" onClick={() => retry(u)} style={LINK_BTN}>Reintentar</button>}
                            <button type="button" onClick={() => discard(u.key)} style={{ ...LINK_BTN, color: 'var(--sec)' }}>Descartar</button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <p style={{ ...mutedStyle, marginTop: 14 }}>
          {used} de {MAX_DOCUMENTS} documentos
        </p>
        {full && <Notice tone="warn" style={{ marginTop: 10 }}>Llegaste al máximo de {MAX_DOCUMENTS} documentos por solicitud.</Notice>}
        <p role="status" className="sr-only">{announce}</p>
      </PCard>

      {uploaded === 0 && !busy && (
        <Notice tone="info" style={{ marginBottom: 16 }}>
          Si ahora no tenés los documentos a mano, podés finalizar y subirlos después desde Mis solicitudes.
        </Notice>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PBtn variant="accent" onClick={onFinish} disabled={busy}>{busy ? 'Subiendo…' : 'Finalizar'}</PBtn>
      </div>
    </>
  );
}
