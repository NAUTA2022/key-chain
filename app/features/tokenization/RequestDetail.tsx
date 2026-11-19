import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { Icons, PBtn, PTag } from '~/components/ui';
import { DOC_TYPES, call, checkFile, downloadAuthed, errorText, fmtDate, fmtDateTime, fmtSize, uploadFile, useApi } from '~/features/profile/api';
import { Modal, Notice, Skeleton } from '~/features/profile/kit';
import { bodyStyle, labelStyle, mutedStyle } from '~/features/profile/styles';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import type { NavFn } from '~/lib/navigation';
import {
  documentsPath, fmtCount, fmtMoney, fmtPercent, isClosedConflict, isOpen, MAX_DOCUMENT_BYTES, MAX_DOCUMENTS, uploadErrorText,
  type RequestDocument, type TokenizationRequestDetail,
} from './api';
import { categoryLabel } from './labels';
import { lifecycleOf, MILESTONES, type Lifecycle } from './lifecycle';

// Detail dialog of one of the user's requests (GET /v1/tokenization-requests/{id}).
// Remounted on every open (keyed by the caller), so it always shows fresh data.

const NOTE_BOX: CSSProperties = { ...bodyStyle, fontSize: 13, color: 'var(--text)', background: 'var(--surface2)', borderRadius: 12, padding: '10px 14px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' };

export default function RequestDetail({ id, open, onClose, nav }: { id: string; open: boolean; onClose: () => void; nav: NavFn }) {
  const isMobile = useMobile();
  const { data, error, loading, reload, mutate } = useApi<TokenizationRequestDetail>(`tokenization-request:${id}`, () =>
    call(api.GET('/v1/tokenization-requests/{id}', { params: { path: { id } } })),
  );
  // The file input lives outside the dialog: the dialog focuses its first <input> on open.
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const upload = async (detail: TokenizationRequestDetail, file: File) => {
    setUploading(true);
    setFeedback(null);
    const { data: doc, error: e } = await uploadFile<RequestDocument>(documentsPath(detail.id), file);
    setUploading(false);
    if (!doc) {
      setFeedback({ tone: 'error', text: uploadErrorText(e) });
      if (isClosedConflict(e)) reload();
      return;
    }
    mutate({ ...detail, documents: [...detail.documents, doc] });
    setFeedback({ tone: 'success', text: `Subimos ${doc.filename}.` });
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !data) return;
    const problem = checkFile(file, { types: DOC_TYPES, maxBytes: MAX_DOCUMENT_BYTES });
    if (problem) return setFeedback({ tone: 'error', text: problem });
    void upload(data, file);
  };

  const download = async (doc: RequestDocument) => {
    setDownloading(doc.id);
    setDownloadError(null);
    const ok = await downloadAuthed(doc.url, doc.filename);
    setDownloading(null);
    if (!ok) setDownloadError(`No pudimos descargar ${doc.filename}. Prueba de nuevo.`);
  };

  const d = data;
  const life = d ? lifecycleOf(d) : null;
  const assetId = d && life?.viewable ? d.assetId : null;
  const canAdd = d !== null && isOpen(d.status) && d.documents.length < MAX_DOCUMENTS;
  const rows = (items: Array<[string, string]>) => (
    <dl style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', columnGap: 16 }}>
      {items.map(([k, v]) => (
        <div key={k} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-l)', minWidth: 0 }}>
          <dt style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginBottom: 3 }}>{k}</dt>
          <dd style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', fontWeight: 500, overflowWrap: 'anywhere' }}>{v}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <>
      <input ref={fileRef} type="file" accept={DOC_TYPES.join(',')} onChange={onPick} hidden tabIndex={-1} aria-hidden="true" />
      <Modal
        open={open}
        onClose={onClose}
        width={640}
        title={d ? d.data.assetName : 'Solicitud de tokenización'}
        footer={
          <>
            {assetId !== null && (
              <PBtn variant="accent" small onClick={() => nav('detalle', { id: assetId })}>Ver activo</PBtn>
            )}
            <PBtn variant="secondary" small onClick={onClose}>Cerrar</PBtn>
          </>
        }
      >
        {!d && loading ? (
          <Skeleton rows={6} />
        ) : !d ? (
          <Notice tone="error">{errorText(error, 'No pudimos cargar la solicitud.', { not_found: 'No encontramos esta solicitud.' })}</Notice>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {life && <PTag label={life.label} color={life.color} />}
              <span style={mutedStyle}>Enviada el {fmtDateTime(d.createdAt)}</span>
              {d.updatedAt !== d.createdAt && <span style={mutedStyle}>· Actualizada el {fmtDateTime(d.updatedAt)}</span>}
            </div>

            {life && <LifecycleSummary life={life} rejected={d.status === 'rejected'} isMobile={isMobile} />}

            {d.reviewNote && (
              <p style={NOTE_BOX}>
                <strong>{d.status === 'rejected' ? 'Motivo del rechazo:' : 'Nota del equipo:'}</strong> {d.reviewNote}
              </p>
            )}

            <section>
              <h3 style={labelStyle}>Activo</h3>
              {rows([
                ['Tipo de activo', categoryLabel(d.data)],
                ['Nombre', d.data.assetName],
                ['País', d.data.country],
                ['Ubicación', d.data.location],
                ['Duración estimada', d.data.lifespan],
              ])}
              <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border-l)' }}>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginBottom: 3 }}>Descripción</div>
                <p style={{ ...bodyStyle, color: 'var(--text)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{d.data.description}</p>
              </div>
            </section>

            <section>
              <h3 style={labelStyle}>Tokenomics</h3>
              {rows([
                ['Valuación', fmtMoney(d.data.valuation)],
                ['Precio por token', fmtMoney(d.data.tokenPrice, 6)],
                ['Tokens a emitir', fmtCount(d.data.totalTokens)],
                ['Capitalización', fmtMoney(d.data.tokenPrice * d.data.totalTokens)],
                ['Rendimiento anual esperado', fmtPercent(d.data.expectedApy)],
              ])}
            </section>

            <section>
              <h3 style={labelStyle}>Contacto</h3>
              {rows([
                ['Nombre', d.data.contactName],
                ['Email', d.data.contactEmail],
                ['Teléfono', d.data.contactPhone ?? '—'],
              ])}
            </section>

            <section>
              <h3 style={labelStyle}>Documentos ({d.documents.length})</h3>
              {d.documents.length === 0 ? (
                <p style={{ ...mutedStyle, marginTop: 8 }}>Todavía no subiste documentos.</p>
              ) : (
                <ul style={{ listStyle: 'none', marginTop: 4 }}>
                  {d.documents.map(doc => (
                    <li key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 0', borderBottom: '1px solid var(--border-l)' }}>
                      <span aria-hidden="true" style={{ display: 'flex', color: 'var(--ter)' }}>{Icons.doc}</span>
                      <span style={{ flex: '1 1 180px', minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', overflowWrap: 'anywhere' }}>{doc.filename}</span>
                        <span style={{ display: 'block', ...mutedStyle, fontSize: 12 }}>{fmtSize(doc.size)} · {fmtDate(doc.createdAt)}</span>
                      </span>
                      <PBtn variant="ghost" small onClick={() => void download(doc)} disabled={downloading === doc.id}>
                        {downloading === doc.id ? 'Descargando…' : 'Descargar'}
                        <span className="sr-only"> {doc.filename}</span>
                      </PBtn>
                    </li>
                  ))}
                </ul>
              )}
              {downloadError && <Notice tone="error" style={{ marginTop: 10 }}>{downloadError}</Notice>}

              {isOpen(d.status) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                  <PBtn variant="secondary" small onClick={() => fileRef.current?.click()} disabled={!canAdd || uploading}>
                    {uploading ? 'Subiendo…' : 'Agregar documento'}
                  </PBtn>
                  <span style={{ ...mutedStyle, fontSize: 12 }}>
                    {d.documents.length >= MAX_DOCUMENTS ? `Llegaste al máximo de ${MAX_DOCUMENTS} documentos.` : `PDF, PNG, JPG o WebP, hasta 10 MB · máximo ${MAX_DOCUMENTS}.`}
                  </span>
                </div>
              ) : (
                <Notice tone="info" style={{ marginTop: 14 }}>
                  Esta solicitud ya fue {d.status === 'approved' ? 'aprobada' : 'rechazada'}: no admite más documentos.
                  {d.status === 'approved' && ' Si el equipo necesita algo más, te va a contactar.'}
                </Notice>
              )}
              {feedback && <Notice tone={feedback.tone} style={{ marginTop: 10 }}>{feedback.text}</Notice>}
            </section>
          </div>
        )}
      </Modal>
    </>
  );
}

/** Current stage, what it means and the request → project → on-chain timeline. */
function LifecycleSummary({ life, rejected, isMobile }: { life: Lifecycle; rejected: boolean; isMobile: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ ...bodyStyle, fontSize: 13.5, overflowWrap: 'anywhere' }}>{life.text}</p>
      {!rejected && (
        <ol aria-label="Etapas del proyecto" style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 8 }}>
          {MILESTONES.map((m, i) => {
            const done = i <= life.milestone;
            const current = i === life.milestone;
            return (
              <li
                key={m}
                aria-current={current ? 'step' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, minWidth: 0,
                  background: current ? 'var(--accent-bg)' : 'var(--surface2)', border: `1px solid ${current ? 'var(--accent)' : 'var(--border-l)'}`,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'var(--pos)' : 'transparent', border: `1.5px solid ${done ? 'var(--pos)' : 'var(--border)'}`, color: '#fff', fontSize: 10, fontWeight: 700,
                  }}
                >
                  {done ? '✓' : ''}
                </span>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: current ? 600 : 450, color: done ? 'var(--text)' : 'var(--ter)', overflowWrap: 'anywhere' }}>
                  {m}
                  <span className="sr-only">{done ? ' (alcanzada)' : ' (pendiente)'}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {!life.viewable && life.milestone >= 1 && life.stage !== 'archived' && life.stage !== 'draft' && (
        <p style={{ ...mutedStyle, fontSize: 12.5 }}>El proyecto todavía no es público: vas a poder verlo en el mercado cuando el equipo lo publique.</p>
      )}
    </div>
  );
}
