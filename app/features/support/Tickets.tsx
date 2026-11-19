import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icons, PBtn, PTag } from '~/components/ui';
import { call, DOC_TYPES, downloadAuthed, errorText, fmtDate, fmtDateTime, fmtRelative, fmtSize, paragraphs, uploadFile, useApi } from '~/features/profile/api';
import { ConfirmDialog, EmptyState, Field, FileButton, Modal, Notice, Section, Select, Skeleton, TextArea, TextInput, type NoticeTone } from '~/features/profile/kit';
import { bodyStyle, labelStyle, mutedStyle } from '~/features/profile/styles';
import { api } from '~/lib/api/client';
import type { SessionStatus } from '~/lib/session';
import {
  ATTACHMENT_MAX_BYTES, MAX_ATTACHMENTS, MESSAGE_MAX, STATUS_TAG, SUBJECT_MAX, TICKET_CATEGORIES, VALIDATION_VARS,
  categoryKey, srOnly, ticketErrorText, validateNewTicket, validateReply,
  type NewTicketErrors, type NewTicketField, type TicketAttachment, type TicketDetail, type TicketSummary,
} from './schema';
import SignInCta from './SignInCta';
import { useT } from '~/i18n/useT';

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
  const { t } = useT('help');
  const { t: tp, locale } = useT('profile');

  let body: ReactNode;
  if (status === 'anonymous') {
    body = (
      <SignInCta
        title={t('tickets.signInListTitle')}
        text={t('tickets.signInListText')}
      />
    );
  } else if (status !== 'authenticated' || (!tickets.data && !tickets.error)) {
    body = <Skeleton rows={3} height={18} />;
  } else if (!tickets.data) {
    body = (
      <Notice tone="error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span>{errorText(tickets.error, t('tickets.loadListError'))}</span>
        <PBtn variant="secondary" small onClick={tickets.reload}>{t('shared.retry')}</PBtn>
      </Notice>
    );
  } else if (!tickets.data.length) {
    body = (
      <EmptyState
        icon={Icons.doc}
        title={t('tickets.emptyTitle')}
        text={t('tickets.emptyText')}
        action={<PBtn variant="secondary" small onClick={onNew}>{t('tickets.openTicket')}</PBtn>}
      />
    );
  } else {
    body = (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {tickets.data.map((tk, i) => {
          const tag = STATUS_TAG[tk.status];
          const fresh = tk.lastMessageFromStaff && tk.status === 'answered';
          return (
            <li key={tk.id} style={{ borderTop: i ? '1px solid var(--border-l)' : 'none' }}>
              <button type="button" onClick={() => onOpen(tk.id)} style={rowButtonStyle}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tk.subject}
                  </span>
                  <span style={{ ...mutedStyle, display: 'block', marginTop: 3 }}>
                    {t(categoryKey(tk.category))} · <time dateTime={tk.lastMessageAt}>{fmtRelative(tk.lastMessageAt, now, tp, locale)}</time>
                  </span>
                  {fresh && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontFamily: 'var(--font-b)', fontSize: 12, fontWeight: 600, color: 'var(--accent-text)' }}>
                      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                      {t('tickets.newReply')}
                    </span>
                  )}
                </span>
                <PTag label={t(tag.label)} color={tag.color} />
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
      title={t('tickets.listTitle')}
      style={style}
      action={status === 'authenticated' ? <PBtn variant="accent" small onClick={onNew}>{t('tickets.openTicket')}</PBtn> : undefined}
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
  const { t } = useT('help');
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
      setFormError(ticketErrorText(t, created.error, t('tickets.createError')));
      return;
    }
    let attachmentError: string | null = null;
    if (file) {
      const up = await uploadFile<TicketAttachment>(`/v1/support/tickets/${created.data.id}/attachments`, file);
      if (!up.data) attachmentError = ticketErrorText(t, up.error, t('tickets.uploadError'), 'upload');
    }
    setBusy(false);
    onCreated(created.data.id, attachmentError);
  };

  const clearError = (k: NewTicketField) => setErrors(e => (e[k] ? { ...e, [k]: undefined } : e));

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={t('tickets.openTicket')}
      width={560}
      footer={
        authed ? (
          <>
            <PBtn variant="secondary" small onClick={onClose} disabled={busy}>{t('tickets.cancel')}</PBtn>
            <PBtn variant="accent" small onClick={() => void submit()} disabled={busy}>{busy ? t('tickets.sending') : t('tickets.submit')}</PBtn>
          </>
        ) : undefined
      }
    >
      {status === 'anonymous' ? (
        <SignInCta title={t('tickets.signInNewTitle')} text={t('tickets.signInNewText')} />
      ) : !authed ? (
        <Skeleton rows={4} height={18} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ ...bodyStyle, margin: 0 }}>{t('tickets.newIntro')}</p>
          <Field label={t('tickets.subject')} htmlFor={ids.subject} error={errors.subject && t(errors.subject, VALIDATION_VARS)}>
            <TextInput
              id={ids.subject}
              value={subject}
              maxLength={SUBJECT_MAX}
              disabled={busy}
              invalid={Boolean(errors.subject)}
              placeholder={t('tickets.subjectPlaceholder')}
              onChange={e => {
                setSubject(e.target.value);
                clearError('subject');
              }}
            />
          </Field>
          <Field label={t('tickets.category')} htmlFor={ids.category} error={errors.category && t(errors.category, VALIDATION_VARS)}>
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
              <option value="" disabled>{t('tickets.categoryPlaceholder')}</option>
              {TICKET_CATEGORIES.map(c => (
                <option key={c} value={c}>{t(categoryKey(c))}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('tickets.message')} htmlFor={ids.message} error={errors.message && t(errors.message, VALIDATION_VARS)} hint={t('tickets.messageHint', { count: message.trim().length, max: MESSAGE_MAX })}>
            <TextArea
              id={ids.message}
              value={message}
              rows={6}
              maxLength={MESSAGE_MAX}
              disabled={busy}
              invalid={Boolean(errors.message)}
              placeholder={t('tickets.messagePlaceholder')}
              onChange={e => {
                setMessage(e.target.value);
                clearError('message');
              }}
            />
          </Field>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)' }}>{t('tickets.attachmentOptional')}</span>
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px', minWidth: 0 }}>
                <span aria-hidden="true" style={{ color: 'var(--ter)', display: 'flex', flexShrink: 0 }}>{Icons.doc}</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span style={{ ...mutedStyle, flexShrink: 0 }}>{fmtSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={busy}
                  aria-label={t('tickets.removeFile', { name: file.name })}
                  style={{ border: 'none', background: 'none', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', padding: '2px 4px', flexShrink: 0 }}
                >
                  {t('tickets.remove')}
                </button>
              </div>
            ) : (
              <div>
                <FileButton label={t('tickets.attachFile')} accept={DOC_TYPES} maxBytes={ATTACHMENT_MAX_BYTES} onFile={setFile} onError={setFileError} disabled={busy} />
              </div>
            )}
            {fileError ? (
              <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)' }}>{fileError}</div>
            ) : (
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)' }}>{t('tickets.fileTypes')}</div>
            )}
          </div>
          {formError && <Notice tone="error">{formError}</Notice>}
          <div role="status" style={srOnly}>{busy ? t('tickets.sendingTicket') : ''}</div>
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
  const { t } = useT('help');
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
      patch({ reply: '', feedback: { tone: 'success', text: t('tickets.sent') } });
      onChanged();
    } else {
      patch({ feedback: { tone: 'error', text: ticketErrorText(t, r.error, t('tickets.sendError')) } });
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
      patch({ reply: '', replyError: null, feedback: { tone: 'success', text: t('tickets.closedOk') } });
      onChanged();
    } else {
      patch({ feedback: { tone: 'error', text: ticketErrorText(t, r.error, t('tickets.closeError')) } });
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
      patch({ feedback: { tone: 'success', text: t('tickets.attached', { name: r.data.filename }) } });
      onChanged();
    } else {
      patch({ feedback: { tone: 'error', text: ticketErrorText(t, r.error, t('tickets.uploadRetryError'), 'upload') } });
      detail.reload();
    }
  };

  const download = async (a: TicketAttachment) => {
    setDownloading(a.id);
    const ok = await downloadAuthed(a.url, a.filename);
    setDownloading(null);
    if (!ok) patch({ feedback: { tone: 'error', text: t('tickets.downloadError', { name: a.filename }) } });
  };

  const notice = local.feedback ?? (flash && flash.id === id ? { tone: flash.tone, text: flash.text } : null);

  let body: ReactNode;
  if (status === 'anonymous') {
    body = <SignInCta title={t('tickets.signInDetailTitle')} text={t('tickets.signInDetailText')} />;
  } else if (!ticket && detail.error) {
    body = (
      <Notice tone="error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span>{ticketErrorText(t, detail.error, t('tickets.loadError'), 'load')}</span>
        <PBtn variant="secondary" small onClick={detail.reload}>{t('shared.retry')}</PBtn>
      </Notice>
    );
  } else if (!ticket) {
    body = <Skeleton rows={4} height={18} />;
  } else {
    const tag = STATUS_TAG[ticket.status];
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PTag label={t(tag.label)} color={tag.color} />
          <span style={mutedStyle}>{t(categoryKey(ticket.category))} · {t('tickets.openedOn')} <time dateTime={ticket.createdAt}>{fmtDate(ticket.createdAt)}</time></span>
        </div>

        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        <ol aria-label={t('tickets.messagesLabel')} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ticket.messages.map((m, i) => {
            const mine = !m.fromStaff;
            return (
              <li key={m.id} ref={i === ticket.messages.length - 1 ? lastRef : undefined} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ ...mutedStyle, fontSize: 11.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: mine ? 'var(--sec)' : 'var(--accent-text)' }}>{mine ? t('shared.you') : t('tickets.staff')}</span>
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
            <div style={{ ...labelStyle, marginBottom: 8 }}>{t('tickets.attachments', { count: attachments.length, max: MAX_ATTACHMENTS })}</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachments.map(a => (
                <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderRadius: 12, padding: '8px 10px 8px 12px', minWidth: 0 }}>
                  <span aria-hidden="true" style={{ color: 'var(--ter)', display: 'flex', flexShrink: 0 }}>{Icons.doc}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</span>
                    <span style={{ ...mutedStyle, fontSize: 11.5 }}>{fmtSize(a.size)} · {fmtDate(a.createdAt)}</span>
                  </span>
                  <PBtn variant="ghost" small onClick={() => void download(a)} disabled={downloading === a.id} style={{ padding: '7px 12px', flexShrink: 0 }}>
                    {downloading === a.id ? t('tickets.downloading') : t('tickets.download')}
                  </PBtn>
                </li>
              ))}
            </ul>
          </div>
        )}

        {closed ? (
          <Notice tone="info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>{t('tickets.closedNotice')}</span>
            <PBtn variant="secondary" small onClick={onNewTicket}>{t('tickets.openNew')}</PBtn>
          </Notice>
        ) : (
          <Field
            label={t('tickets.replyLabel')}
            htmlFor={replyId}
            error={local.replyError && t(local.replyError, VALIDATION_VARS)}
            hint={limitReached ? t('tickets.limitReached', { max: MAX_ATTACHMENTS }) : t('tickets.replyHint')}
          >
            <TextArea
              id={replyId}
              value={local.reply}
              rows={4}
              maxLength={MESSAGE_MAX}
              disabled={busy !== null}
              invalid={Boolean(local.replyError)}
              placeholder={t('tickets.replyPlaceholder')}
              onChange={e => patch({ reply: e.target.value, replyError: null })}
            />
          </Field>
        )}
        <div role="status" style={srOnly}>
          {busy === 'send' ? t('tickets.sendingMessage') : busy === 'attach' ? t('tickets.uploadingFile') : busy === 'close' ? t('tickets.closingTicket') : ''}
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
        title={ticket?.subject ?? t('tickets.fallbackTitle')}
        width={640}
        footer={
          ticket && !closed && authed ? (
            <>
              <FileButton
                label={busy === 'attach' ? t('tickets.uploading') : t('tickets.attachFile')}
                accept={DOC_TYPES}
                maxBytes={ATTACHMENT_MAX_BYTES}
                onFile={f => void attach(f)}
                onError={message => patch({ feedback: message ? { tone: 'error', text: message } : null })}
                disabled={busy !== null || limitReached}
              />
              <PBtn variant="secondary" small onClick={() => setConfirming(true)} disabled={busy !== null}>{t('tickets.close')}</PBtn>
              <PBtn variant="accent" small onClick={() => void send()} disabled={busy !== null}>{busy === 'send' ? t('tickets.sending') : t('tickets.send')}</PBtn>
            </>
          ) : undefined
        }
      >
        {body}
      </Modal>
      <ConfirmDialog
        open={confirming && id !== null}
        title={t('tickets.confirmTitle')}
        confirmLabel={t('tickets.close')}
        busy={busy === 'close'}
        onConfirm={() => void closeTicket()}
        onClose={() => setConfirming(false)}
      >
        {t('tickets.confirmText')}
      </ConfirmDialog>
    </>
  );
}
