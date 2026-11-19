import { useState } from 'react';
import { PTag } from '~/components/ui';
import { api } from '~/lib/api/client';
import { downloadFile, errorText, unwrap, useApiData } from './api';
import { fmtBytes, fmtDate, fmtDateTime, fmtInt, userName } from './format';
import { TICKET_CATEGORY, TICKET_STATUS } from './labels';
import { replySchema, validate } from './schemas';
import { linkBtn, strong, sub, td, tdDim } from './styles';
import type { TicketDetail, TicketStatus } from './types';
import { Btn, Chips, DataTable, Drawer, Field, Hash, Notice, Panel, Row, Tag, TextArea } from './ui';
import { useConfirm } from './useConfirm';

type Filter = 'all' | TicketStatus;
const FILTERS: Array<[Filter, string]> = [['open', 'Abiertos'], ['answered', 'Respondidos'], ['closed', 'Cerrados'], ['all', 'Todos']];

/** "Soporte": user tickets, the conversation with attachments, staff replies and closing. */
export function SupportTab({ selected, onSelect, onChange }: { selected: string | null; onSelect: (id: string | null) => void; onChange: () => void }) {
  const [status, setStatus] = useState<Filter>('open');
  const list = useApiData(`tickets|${status}`, () =>
    unwrap(api.GET('/v1/admin/support/tickets', { params: { query: status === 'all' ? {} : { status } } }), 'No se pudieron cargar los tickets.'), { keepPrevious: true });
  const rows = list.data ?? [];

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Chips<Filter> ariaLabel="Filtrar tickets por estado" options={FILTERS} value={status} onChange={setStatus} />
      </div>
      <DataTable
        head={['Asunto', 'Categoría', 'Usuario', 'Mensajes', 'Último mensaje', 'Estado', '']}
        minWidth={900}
        loading={list.loading} error={list.error} empty={rows.length === 0} emptyText="No hay tickets en este estado."
      >
        {rows.map((t, i) => (
          <Row key={t.id} last={i === rows.length - 1}>
            <td style={td}><span style={strong}>{t.subject}</span></td>
            <td style={td}><PTag label={TICKET_CATEGORY[t.category]} color="neutral" /></td>
            <td style={td}>{userName(t.user)}</td>
            <td style={td}>{fmtInt(t.messageCount)}</td>
            <td style={tdDim}>
              {fmtDateTime(t.lastMessageAt)}
              {t.status !== 'closed' && !t.lastMessageFromStaff && <div style={{ color: 'var(--neg)', fontWeight: 600, marginTop: 2 }}>Esperando respuesta</div>}
            </td>
            <td style={td}><Tag spec={TICKET_STATUS[t.status]} /></td>
            <td style={td}><Btn small variant="ghost" onClick={() => onSelect(t.id)}>Abrir</Btn></td>
          </Row>
        ))}
      </DataTable>
      {selected && <TicketDrawer key={selected} id={selected} onClose={() => onSelect(null)} onChanged={() => { list.reload(); onChange(); }} />}
    </>
  );
}

function TicketDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const detail = useApiData(`ticket|${id}`, () => unwrap(api.GET('/v1/admin/support/tickets/{id}', { params: { path: { id } } }), 'No se pudo cargar el ticket.'));
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const t = ticket && ticket.id === id && detail.data && ticket.updatedAt >= detail.data.updatedAt ? ticket : detail.data;
  return (
    <Drawer
      title={t ? t.subject : 'Ticket de soporte'}
      subtitle={t ? <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><Tag spec={TICKET_STATUS[t.status]} />{TICKET_CATEGORY[t.category]} · {userName(t.user)} · abierto {fmtDate(t.createdAt)}</span> : undefined}
      onClose={onClose}
    >
      {!t && (detail.error ? <Notice tone="error">{detail.error}</Notice> : <span style={sub}>Cargando…</span>)}
      {t && <TicketBody ticket={t} onUpdated={next => { setTicket(next); onChanged(); }} />}
    </Drawer>
  );
}

function TicketBody({ ticket: t, onUpdated }: { ticket: TicketDetail; onUpdated: (t: TicketDetail) => void }) {
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const { confirm, dialog } = useConfirm();
  const path = { params: { path: { id: t.id } } };

  async function send() {
    const v = validate(replySchema, { body: reply });
    if (!v.ok) return setReplyError(v.errors.body ?? 'Escribí una respuesta.');
    setReplyError(null);
    setBusy(true);
    setNote(null);
    try {
      onUpdated(await unwrap(api.POST('/v1/admin/support/tickets/{id}/reply', { ...path, body: v.data }), 'No se pudo enviar la respuesta.'));
      setReply('');
      setNote({ tone: 'ok', text: 'Respuesta enviada. El usuario recibe una notificación.' });
    } catch (e) {
      setNote({ tone: 'error', text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    if (!(await confirm({ title: 'Cerrar ticket', message: `Se cerrará "${t.subject}". El usuario ya no podrá responder en este hilo.`, confirmLabel: 'Cerrar ticket', danger: true }))) return;
    setBusy(true);
    setNote(null);
    try {
      onUpdated(await unwrap(api.POST('/v1/admin/support/tickets/{id}/close', path), 'No se pudo cerrar el ticket.'));
      setNote({ tone: 'ok', text: 'Ticket cerrado.' });
    } catch (e) {
      setNote({ tone: 'error', text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function download(url: string, filename: string) {
    try {
      await downloadFile(url, filename);
    } catch (e) {
      setNote({ tone: 'error', text: errorText(e, 'No se pudo descargar el archivo.') });
    }
  }

  return (
    <>
      <Panel title="Conversación" action={<Hash value={t.user.walletAddress} kind="address" />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {t.messages.length === 0 && <div style={sub}>Sin mensajes.</div>}
          {t.messages.map(m => (
            <div key={m.id} style={{ alignSelf: m.fromStaff ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
              <div style={{
                padding: '10px 14px', borderRadius: 14, fontFamily: 'var(--font-b)', fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                background: m.fromStaff ? 'var(--accent)' : 'var(--surface2)', color: m.fromStaff ? 'var(--accent-fg)' : 'var(--text)',
                borderBottomRightRadius: m.fromStaff ? 4 : 14, borderBottomLeftRadius: m.fromStaff ? 14 : 4,
              }}>
                {m.body}
              </div>
              <div style={{ ...sub, fontSize: 11, marginTop: 4, textAlign: m.fromStaff ? 'right' : 'left' }}>{m.fromStaff ? 'Soporte La 33' : userName(t.user)} · {fmtDateTime(m.createdAt)}</div>
            </div>
          ))}
        </div>
      </Panel>

      {t.attachments.length > 0 && (
        <Panel title={`Adjuntos (${t.attachments.length})`}>
          {t.attachments.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < t.attachments.length - 1 ? '1px solid var(--border-l)' : 'none', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={strong}>{a.filename}</div>
                <div style={{ ...sub, marginTop: 2 }}>{fmtBytes(a.size)} · {fmtDateTime(a.createdAt)}</div>
              </div>
              <button type="button" style={linkBtn} onClick={() => void download(a.url, a.filename)}>Descargar</button>
            </div>
          ))}
        </Panel>
      )}

      {t.status !== 'closed' ? (
        <Panel title="Responder">
          <form onSubmit={e => { e.preventDefault(); void send(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} noValidate>
            <Field label="Respuesta" error={replyError ?? undefined}>
              <TextArea value={reply} onChange={e => setReply(e.target.value)} maxLength={5000} rows={4} placeholder="Escribí la respuesta para el usuario" invalid={Boolean(replyError)} />
            </Field>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn small variant="accent" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar respuesta'}</Btn>
              <Btn small variant="secondary" disabled={busy} onClick={() => void close()}>Cerrar ticket</Btn>
            </div>
          </form>
        </Panel>
      ) : <Notice>Este ticket está cerrado.</Notice>}
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {dialog}
    </>
  );
}
