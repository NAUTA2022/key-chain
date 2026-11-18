import { useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router';
import { PCard, PSection } from '~/components/ui';
import { call, useApi } from '~/features/profile/api';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { useSession } from '~/lib/session';
import AssistantChat from './AssistantChat';
import FaqLive from './FaqLive';
import { GlossaryCard, GuidesCard } from '~/features/guide/HelpGuides';
import type { TicketSummary } from './schema';
import { NewTicketModal, TicketDetailModal, TicketsSection, type TicketFlash } from './Tickets';

// Help Center wired to the API: FAQ (public), tickets and the assistant (session required).

const contactBtn: CSSProperties = { padding: '12px 24px', borderRadius: 12, fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 14, cursor: 'pointer' };

export default function HelpCenterLive() {
  const { status } = useSession();
  const isMobile = useMobile();
  const [params, setParams] = useSearchParams();
  const ticketId = params.get('ticket');
  const authed = status === 'authenticated';
  const tickets = useApi<TicketSummary[]>(authed ? 'support-tickets' : null, () => call(api.GET('/v1/support/tickets')));
  // `key` remounts the form on every open so it starts clean (optionally pre-filled).
  const [newTicket, setNewTicket] = useState({ key: 0, open: false, draft: '' });
  const [chatOpen, setChatOpen] = useState(false);
  const [flash, setFlash] = useState<TicketFlash | null>(null);

  const openTicket = (id: string) =>
    setParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.set('ticket', id);
        return next;
      },
      { preventScrollReset: true },
    );

  const closeTicket = () => {
    setFlash(null);
    setParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete('ticket');
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  const startTicket = (draft = '') => {
    setChatOpen(false);
    setNewTicket(s => ({ key: s.key + 1, open: true, draft }));
  };

  const onCreated = (id: string, attachmentError: string | null) => {
    setNewTicket(s => ({ ...s, open: false }));
    tickets.reload();
    setFlash(
      attachmentError
        ? { id, tone: 'warn', text: `Creamos tu ticket, pero no pudimos adjuntar el archivo: ${attachmentError} Podés volver a intentarlo desde acá.` }
        : { id, tone: 'success', text: 'Creamos tu ticket. Te vamos a responder por acá y vas a ver la respuesta en Mis tickets.' },
    );
    openTicket(id);
  };

  return (
    <div style={{ padding: isMobile ? '16px 14px 80px' : '28px 32px 40px', maxWidth: 900, margin: '0 auto' }}>
      <PSection title="Centro de Ayuda" sub="Encontrá respuestas a las preguntas más frecuentes." />

      <FaqLive onAsk={() => startTicket()} />

      <GuidesCard style={{ marginTop: 32 }} />
      <GlossaryCard style={{ marginTop: 24 }} />

      {/* Contact */}
      <PCard style={{ padding: isMobile ? '22px 18px' : '24px 28px', marginTop: 32, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>¿No encontraste lo que buscabas?</div>
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', marginBottom: 18 }}>Escribinos y te respondemos por acá; vas a ver la respuesta en Mis tickets.</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => startTicket()} style={{ ...contactBtn, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)' }}>Abrir un ticket</button>
          <button type="button" onClick={() => setChatOpen(true)} style={{ ...contactBtn, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)' }}>Chat en vivo</button>
        </div>
      </PCard>

      <TicketsSection status={status} tickets={tickets} onOpen={openTicket} onNew={() => startTicket()} style={{ marginTop: 24, ...(isMobile ? { padding: '18px 16px' } : null) }} />

      <NewTicketModal
        key={newTicket.key}
        open={newTicket.open}
        status={status}
        initialMessage={newTicket.draft}
        onClose={() => setNewTicket(s => ({ ...s, open: false }))}
        onCreated={onCreated}
      />
      <TicketDetailModal
        id={ticketId}
        status={status}
        flash={flash}
        onClose={closeTicket}
        onChanged={tickets.reload}
        onNewTicket={() => {
          closeTicket();
          startTicket();
        }}
      />
      <AssistantChat open={chatOpen} status={status} onClose={() => setChatOpen(false)} onOpenTicket={startTicket} />
    </div>
  );
}
