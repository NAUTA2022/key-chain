import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icons, PBtn, PTag } from '~/components/ui';
import { call, DOC_TYPES, downloadAuthed, errorText, fmtDate, fmtDateTime, fmtRelative, fmtSize, paragraphs, uploadFile, useApi } from '~/features/profile/api';
import { ConfirmDialog, EmptyState, Field, FileButton, Modal, Notice, Section, Select, Skeleton, TextArea, TextInput, type NoticeTone } from '~/features/profile/kit';
import { bodyStyle, labelStyle, mutedStyle } from '~/features/profile/styles';
import { api } from '~/lib/api/client';
import type { SessionStatus } from '~/lib/session';
import {
  ATTACHMENT_MAX_BYTES, CATEGORY_LABEL, MAX_ATTACHMENTS, MESSAGE_MAX, STATUS_TAG, SUBJECT_MAX, TICKET_CATEGORIES,
  srOnly, ticketErrorText, validateNewTicket, validateReply,
  type NewTicketErrors, type NewTicketField, type TicketAttachment, type TicketDetail, type TicketSummary,
} from './schema';
import SignInCta from './SignInCta';

// Support tickets: "Mis tickets" list, new-ticket form and the ticket thread.

export type TicketFlash = { id: string; tone: NoticeTone; text: string };
type Feedback = { tone: NoticeTone; text: string };

const rowButtonStyle: CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 4px', background: 'none', border: 'none',
  cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit',
};

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {paragraphs(text).map((p, i) => (
        <p key={i} style={{ margin: i ? '8px 0 0' : 0, whiteSpace: 'pre-line' }}>{p}</p>
      ))}
    </>
  );
}

// ─── List ────────────────────────────────────────────────────────────────────

export function TicketsSection({ status, tickets, onOpen, onNew, style }: {
  status: SessionStatus;
  tickets: { data: TicketSummary[] | null; error: unknown; reload: () => void };
  onOpen: (id: string) => void;
  onNew: () => void;
  style?: CSSProperties;
}) {
  const [now] = useState(() => Date.now());

  let body: ReactNode;
  if (status === 'anonymous') {
    body = (
      <SignInCta
        title="Iniciá sesión para ver tus tickets"
        text="Con tu sesión podés abrir tickets, adjuntar archivos y seguir las respuestas del equipo."
      />
    );
  } else if (status !== 'authenticated' || (!tickets.data && !tickets.error)) {
    body = <Skeleton rows={3} height={18} />;
  } else if (!tickets.data) {
    body = (
      <Notice tone="error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span>{errorText(tickets.error, 'No pudimos cargar tus tickets.')}</span>
        <PBtn variant="secondary" small onClick={tickets.reload}>Reintentar</PBtn>
      </Notice>
    );
  } else if (!tickets.data.length) {
    body = (
      <EmptyState
        icon={Icons.doc}
        title="Todavía no abriste tickets"
        text="Cuando abras uno, vas a ver acá las respuestas del equipo."
        action={<PBtn variant="secondary" small onClick={onNew}>Abrir un ticket</PBtn>}
      />
    );
  } else {
    body = (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {tickets.data.map((t, i) => {
          const tag = STATUS_TAG[t.status];
          const fresh = t.lastMessageFromStaff && t.status === 'answered';
          return (
            <li key={t.id} style={{ borderTop: i ? '1px solid var(--border-l)' : 'none' }}>
              <button type="button" onClick={() => onOpen(t.id)} style={rowButtonStyle}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.subject}
                  </span>
                  <span style={{ ...mutedStyle, display: 'block', marginTop: 3 }}>
                    {CATEGORY_LABEL[t.category]} · <time dateTime={t.lastMessageAt}>{fmtRelative(t.lastMessageAt, now)}</time>
                  </span>
                  {fresh && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600, color: 'var(--accent-text)' }}>
                      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                      Nueva respuesta
                    </span>
                  )}
                </span>
                <PTag label={tag.label} color={tag.color} />
                <span aria-hidden="true" style={{ color: 'var(--ter)', display: 'flex', flexShrink: 0 }}>{Icons.chevR}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Section
      title="Mis tickets"
      style={style}
      action={status === 'authenticated' ? <PBtn variant="accent" small onClick={onNew}>Abrir un ticket</PBtn> : undefined}
    >
      {body}
    </Section>
  );
}

// ─── New ticket ──────────────────────────────────────────────────────────────

/** Mount with a fresh `key` each time it opens so the form starts clean. */
export function NewTicketModal({ open, status, initialMessage = '', onClose, onCreated }: {
  open: boolean;
  status: SessionStatus;
  initialMessage?: string;
  onClose: () => void;
  /** Called with the new ticket id and, when the optional attachment failed, its error. */
  onCreated: (id: string, attachmentError: string | null) => void;
}) {
  const subjectId = useId();
  const categoryId = useId();
  const messageId = useId();
  const ids: Record<NewTicketField, string> = { subject: subjectId, category: categoryId, message: messageId };
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState(initialMessage.slice(0, MESSAGE_MAX));
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [errors, setErrors] = useState<NewTicketErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const authed = status === 'authenticated';

  const submit = async () => {
    if (busy) return;
    const v = validateNewTicket({ subject, category, message });
    if (!v.ok) {
      setErrors(v.errors);
      const first = (['subject', 'category', 'message'] as const).find(k => v.errors[k]);
      if (first) document.getElementById(ids[first])?.focus();
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy(true);
    const created = await call(api.POST('/v1/support/tickets', { body: v.data }));
    if (!created.data) {
      setBusy(false);
      setFormError(ticketErrorText(created.error, 'No pudimos crear el ticket. Probá de nuevo en unos minutos.'));
      return;
    }
    let attachmentError: string | null = null;
    if (file) {
      const up = await uploadFile<TicketAttachment>(`/v1/support/tickets/${created.data.id}/attachments`, file);
      if (!up.data) attachmentError = ticketErrorText(up.error, 'No pudimos subir el archivo.', 'upload');
    }
    setBusy(false);
    onCreated(created.data.id, attachmentError);
  };

  const clearError = (k: NewTicketField) => setErrors(e => (e[k] ? { ...e, [k]: undefined } : e));

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Abrir un ticket"
      width={560}
      footer={
        authed ? (
          <>
            <PBtn variant="secondary" small onClick={onClose} disabled={busy}>Cancelar</PBtn>
            <PBtn variant="accent" small onClick={() => void submit()} disabled={busy}>{busy ? 'Enviando…' : 'Enviar ticket'}</PBtn>
          </>
        ) : undefined
      }
    >
      {status === 'anonymous' ? (
        <SignInCta title="Iniciá sesión para abrir un ticket" text="Así podemos responderte y vas a ver la respuesta en Mis tickets." />
      ) : !authed ? (
        <Skeleton rows={4} height={18} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ ...bodyStyle, margin: 0 }}>Contanos qué pasó con el mayor detalle posible. Te respondemos por acá y vas a ver la respuesta en Mis tickets.</p>
          <Field label="Asunto" htmlFor={ids.subject} error={errors.subject}>
            <TextInput
              id={ids.subject}
              value={subject}
              maxLength={SUBJECT_MAX}
              disabled={busy}
              invalid={Boolean(errors.subject)}
              placeholder="Ej.: No puedo ver mi inversión"
              onChange={e => {
                setSubject(e.target.value);
                clearError('subject');
              }}
            />
          </Field>
          <Field label="Categoría" htmlFor={ids.category} error={errors.category}>
            <Select
              id={ids.category}
              value={category}
              disabled={busy}
              aria-invalid={errors.category ? true : undefined}
              style={errors.category ? { borderColor: 'var(--neg)' } : undefined}
              onChange={e => {
                setCategory(e.target.value);
                clearError('category');
              }}
            >
              <option value="" disabled>Elegí una categoría</option>
              {TICKET_CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Mensaje" htmlFor={ids.message} error={errors.message} hint={`${message.trim().length}/${MESSAGE_MAX} caracteres · mínimo 10`}>
            <TextArea
              id={ids.message}
              value={message}
              rows={6}
              maxLength={MESSAGE_MAX}
              disabled={busy}
              invalid={Boolean(errors.message)}
              placeholder="Describí el problema, qué intentaste y, si aplica, el activo o la operación."
              onChange={e => {
                setMessage(e.target.value);
                clearError('message');
              }}
            />
          </Field>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>Archivo adjunto (opcional)</span>
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px', minWidth: 0 }}>
                <span aria-hidden="true" style={{ color: 'var(--ter)', display: 'flex', flexShrink: 0 }}>{Icons.doc}</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span style={{ ...mutedStyle, flexShrink: 0 }}>{fmtSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={busy}
                  aria-label={`Quitar ${file.name}`}
                  style={{ border: 'none', background: 'none', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', padding: '2px 4px', flexShrink: 0 }}
                >
                  Quitar
                </button>
              </div>
            ) : (
              <div>
                <FileButton label="Adjuntar archivo" accept={DOC_TYPES} maxBytes={ATTACHMENT_MAX_BYTES} onFile={setFile} onError={setFileError} disabled={busy} />
              </div>
            )}
            {fileError ? (
              <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)' }}>{fileError}</div>
            ) : (
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>PDF, PNG, JPG o WebP · hasta 10 MB.</div>
            )}
          </div>
          {formError && <Notice tone="error">{formError}</Notice>}
          <div role="status" style={srOnly}>{busy ? 'Enviando ticket…' : ''}</div>
        </div>
      )}
    </Modal>
  );
}

// ─── Detail ──────────────────────────────────────────────────────────────────

type Local = { id: string | null; reply: string; replyError: string | null; feedback: Feedback | null };
const blankLocal = (id: string | null): Local => ({ id, reply: '', replyError: null, feedback: null });
type Busy = 'send' | 'close' | 'attach' | null;

export function TicketDetailModal({ id, status, flash, onClose, onChanged, onNewTicket }: {
  /** Ticket to show (from `?ticket=`); null = closed. */
  id: string | null;
  status: SessionStatus;
  /** One-off notice for a ticket that was just created. */
  flash: TicketFlash | null;
  onClose: () => void;
  /** The ticket changed (reply, close, attachment): refresh the list. */
  onChanged: () => void;
  onNewTicket: () => void;
}) {
  const replyId = useId();
  const authed = status === 'authenticated';
  const detail = useApi<TicketDetail>(id && authed ? `support-ticket:${id}` : null, () =>
    call(api.GET('/v1/support/tickets/{id}', { params: { path: { id: id ?? '' } } })),
  );
  // Draft + feedback belong to one ticket: switching tickets starts clean.
  const [localState, setLocalState] = useState<Local>(() => blankLocal(id));
  const local = localState.id === id ? localState : blankLocal(id);
  const patch = (p: Partial<Local>) => setLocalState(s => ({ ...(s.id === id ? s : blankLocal(id)), ...p, id }));
  const [busy, setBusy] = useState<Busy>(null);
  const [confirming, setConfirming] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const ticket = detail.data;
  const closed = ticket?.status === 'closed';
  const attachments = ticket?.attachments ?? [];
  const limitReached = attachments.length >= MAX_ATTACHMENTS;

  // Bring the latest message into view once the thread loads or grows.
  const lastRef = useRef<HTMLLIElement>(null);
  const messageCount = ticket?.messages.length ?? 0;
  useEffect(() => {
    if (messageCount) lastRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messageCount]);

  const handleClose = () => {
    setConfirming(false);
    onClose();
  };

  const send = async () => {
    if (!id || busy) return;
    const v = validateReply(local.reply);
    if (!v.ok) {
      patch({ replyError: v.error });
      document.getElementById(replyId)?.focus();
      return;
    }
    patch({ replyError: null, feedback: null });
    setBusy('send');
    const r = await call(api.POST('/v1/support/tickets/{id}/messages', { params: { path: { id } }, body: { body: v.body } }));
    setBusy(null);
    if (r.data) {
      detail.mutate(r.data);
      patch({ reply: '', feedback: { tone: 'success', text: 'Mensaje enviado. Te avisamos cuando el equipo responda.' } });
      onChanged();
    } else {
      patch({ feedback: { tone: 'error', text: ticketErrorText(r.error, 'No pudimos enviar el mensaje. Probá de nuevo.') } });
      detail.reload();
    }
  };

  const closeTicket = async () => {
    if (!id || busy) return;
    setBusy('close');
    const r = await call(api.POST('/v1/support/tickets/{id}/close', { params: { path: { id } } }));
    setBusy(null);
    setConfirming(false);
    if (r.data) {
      detail.mutate(r.data);
      patch({ reply: '', replyError: null, feedback: { tone: 'success', text: 'Cerraste el ticket.' } });
      onChanged();
    } else {
      patch({ feedback: { tone: 'error', text: ticketErrorText(r.error, 'No pudimos cerrar el ticket. Probá de nuevo.') } });
    }
  };

  const attach = async (file: File) => {
    if (!id || busy) return;
    patch({ feedback: null });
    setBusy('attach');
    const r = await uploadFile<TicketAttachment>(`/v1/support/tickets/${id}/attachments`, file);
    setBusy(null);
    if (r.data) {
      if (ticket) detail.mutate({ ...ticket, attachments: [...ticket.attachments, r.data] });
      else detail.reload();
      patch({ feedback: { tone: 'success', text: `Adjuntamos ${r.data.filename}.` } });
      onChanged();
    } else {
      patch({ feedback: { tone: 'error', text: ticketErrorText(r.error, 'No pudimos subir el archivo. Probá de nuevo.', 'upload') } });
      detail.reload();
    }
  };

  const download = async (a: TicketAttachment) => {
    setDownloading(a.id);
    const ok = await downloadAuthed(a.url, a.filename);
    setDownloading(null);
    if (!ok) patch({ feedback: { tone: 'error', text: `No pudimos descargar ${a.filename}. Probá de nuevo.` } });
  };

  const notice = local.feedback ?? (flash && flash.id === id ? { tone: flash.tone, text: flash.text } : null);

  let body: ReactNode;
  if (status === 'anonymous') {
    body = <SignInCta title="Iniciá sesión para ver este ticket" text="Los tickets son privados: solo vos y el equipo de soporte pueden verlos." />;
  } else if (!ticket && detail.error) {
    body = (
      <Notice tone="error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span>{ticketErrorText(detail.error, 'No pudimos cargar el ticket.', 'load')}</span>
        <PBtn variant="secondary" small onClick={detail.reload}>Reintentar</PBtn>
      </Notice>
    );
  } else if (!ticket) {
    body = <Skeleton rows={4} height={18} />;
  } else {
    const tag = STATUS_TAG[ticket.status];
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PTag label={tag.label} color={tag.color} />
          <span style={mutedStyle}>{CATEGORY_LABEL[ticket.category]} · Abierto el <time dateTime={ticket.createdAt}>{fmtDate(ticket.createdAt)}</time></span>
        </div>

        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        <ol aria-label="Mensajes del ticket" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ticket.messages.map((m, i) => {
            const mine = !m.fromStaff;
            return (
              <li key={m.id} ref={i === ticket.messages.length - 1 ? lastRef : undefined} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ ...mutedStyle, fontSize: 11.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: mine ? 'var(--sec)' : 'var(--accent-text)' }}>{mine ? 'Vos' : 'Equipo KEY CHAIN'}</span>
                  {' · '}
                  <time dateTime={m.createdAt}>{fmtDateTime(m.createdAt)}</time>
                </div>
                <div
                  style={{
                    ...bodyStyle, color: 'var(--text)', maxWidth: '88%', padding: '10px 14px', overflowWrap: 'anywhere',
                    background: mine ? 'var(--accent-bg)' : 'var(--surface2)',
                    borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  }}
                >
                  <Paragraphs text={m.body} />
                </div>
              </li>
            );
          })}
        </ol>

        {attachments.length > 0 && (
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Archivos adjuntos ({attachments.length}/{MAX_ATTACHMENTS})</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments.map(a => (
                <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderRadius: 12, padding: '8px 10px 8px 12px', minWidth: 0 }}>
                  <span aria-hidden="true" style={{ color: 'var(--ter)', display: 'flex', flexShrink: 0 }}>{Icons.doc}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</span>
                    <span style={{ ...mutedStyle, fontSize: 11.5 }}>{fmtSize(a.size)} · {fmtDate(a.createdAt)}</span>
                  </span>
                  <PBtn variant="ghost" small onClick={() => void download(a)} disabled={downloading === a.id} style={{ padding: '7px 12px', flexShrink: 0 }}>
                    {downloading === a.id ? 'Descargando…' : 'Descargar'}
                  </PBtn>
                </li>
              ))}
            </ul>
          </div>
        )}

        {closed ? (
          <Notice tone="info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>Este ticket está cerrado y es de solo lectura. Si necesitás más ayuda, abrí uno nuevo.</span>
            <PBtn variant="secondary" small onClick={onNewTicket}>Abrir un ticket nuevo</PBtn>
          </Notice>
        ) : (
          <Field
            label="Tu respuesta"
            htmlFor={replyId}
            error={local.replyError}
            hint={limitReached ? `Llegaste al máximo de ${MAX_ATTACHMENTS} archivos en este ticket.` : 'Podés adjuntar PDF, PNG, JPG o WebP de hasta 10 MB.'}
          >
            <TextArea
              id={replyId}
              value={local.reply}
              rows={4}
              maxLength={MESSAGE_MAX}
              disabled={busy !== null}
              invalid={Boolean(local.replyError)}
              placeholder="Escribí tu mensaje…"
              onChange={e => patch({ reply: e.target.value, replyError: null })}
            />
          </Field>
        )}
        <div role="status" style={srOnly}>
          {busy === 'send' ? 'Enviando mensaje…' : busy === 'attach' ? 'Subiendo archivo…' : busy === 'close' ? 'Cerrando ticket…' : ''}
        </div>
      </div>
    );
  }

  return (
    <>
      <Modal
        open={id !== null}
        // Escape also reaches this dialog while the confirmation is on top: only dismiss that one.
        onClose={confirming ? () => setConfirming(false) : handleClose}
        title={ticket?.subject ?? 'Ticket de soporte'}
        width={640}
        footer={
          ticket && !closed && authed ? (
            <>
              <FileButton
                label={busy === 'attach' ? 'Subiendo…' : 'Adjuntar archivo'}
                accept={DOC_TYPES}
                maxBytes={ATTACHMENT_MAX_BYTES}
                onFile={f => void attach(f)}
                onError={message => patch({ feedback: message ? { tone: 'error', text: message } : null })}
                disabled={busy !== null || limitReached}
              />
              <PBtn variant="secondary" small onClick={() => setConfirming(true)} disabled={busy !== null}>Cerrar ticket</PBtn>
              <PBtn variant="accent" small onClick={() => void send()} disabled={busy !== null}>{busy === 'send' ? 'Enviando…' : 'Enviar'}</PBtn>
            </>
          ) : undefined
        }
      >
        {body}
      </Modal>
      <ConfirmDialog
        open={confirming && id !== null}
        title="¿Cerrar este ticket?"
        confirmLabel="Cerrar ticket"
        busy={busy === 'close'}
        onConfirm={() => void closeTicket()}
        onClose={() => setConfirming(false)}
      >
        Vas a poder leerlo, pero ya no vas a poder responder ni adjuntar archivos. Si después necesitás ayuda, abrí un ticket nuevo.
      </ConfirmDialog>
    </>
  );
}
