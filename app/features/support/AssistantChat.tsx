import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { PBtn } from '~/components/ui';
import { call, errorText, paragraphs, problemReason } from '~/features/profile/api';
import { Field, Modal, Notice, Skeleton, TextArea } from '~/features/profile/kit';
import { bodyStyle, mutedStyle } from '~/features/profile/styles';
import { api } from '~/lib/api/client';
import type { SessionStatus } from '~/lib/session';
import { ASSISTANT_MAX_CHARS, assistantPayload, plainText, srOnly, type ChatMessage } from './schema';
import SignInCta from './SignInCta';

// Support assistant (POST /v1/support/assistant). Replies are rendered as plain text only.

type ChatError = { kind: 'unavailable' | 'other'; text: string };

function Bubble({ role, children }: { role: ChatMessage['role']; children: ReactNode }) {
  const mine = role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <div style={{ ...mutedStyle, fontSize: 11.5, fontWeight: 600, marginBottom: 4, color: mine ? 'var(--sec)' : 'var(--accent-text)' }}>
        {mine ? 'Vos' : 'Asistente'}
      </div>
      <div
        style={{
          ...bodyStyle, color: 'var(--text)', maxWidth: '88%', padding: '10px 14px', overflowWrap: 'anywhere',
          background: mine ? 'var(--accent-bg)' : 'var(--surface2)',
          borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function AssistantChat({ open, status, onClose, onOpenTicket }: {
  open: boolean;
  status: SessionStatus;
  onClose: () => void;
  /** Opens the new-ticket form, pre-filled with the user's last question. */
  onOpenTicket: (draft: string) => void;
}) {
  const inputId = useId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const seq = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const authed = status === 'authenticated';

  // Keep the latest turn in view (also when the panel is reopened).
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' });
  }, [open, messages.length, pending, error]);

  const ask = async (history: ChatMessage[]) => {
    const payload = assistantPayload(history);
    if (!payload.length) return;
    setPending(true);
    setError(null);
    const r = await call(api.POST('/v1/support/assistant', { body: { messages: payload } }));
    setPending(false);
    const text = r.data ? plainText(r.data.text).trim() : '';
    if (text) {
      seq.current += 1;
      const id = seq.current;
      setMessages(m => [...m, { id, role: 'assistant', content: text }]);
    } else if (problemReason(r.error) === 'assistant_unavailable') {
      setError({ kind: 'unavailable', text: 'El asistente no está disponible ahora; abrí un ticket y te respondemos.' });
    } else {
      setError({
        kind: 'other',
        text: errorText(r.error, 'No pudimos obtener una respuesta. Probá de nuevo en un momento.', {
          rate_limited: 'El asistente recibió muchas consultas seguidas. Esperá un momento y volvé a probar.',
        }),
      });
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text || pending) return;
    if (text.length > ASSISTANT_MAX_CHARS) {
      setError({ kind: 'other', text: `Tu mensaje puede tener hasta ${ASSISTANT_MAX_CHARS} caracteres.` });
      return;
    }
    seq.current += 1;
    const next: ChatMessage[] = [...messages, { id: seq.current, role: 'user', content: text }];
    setMessages(next);
    setInput('');
    void ask(next);
  };

  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const awaitingReply = messages.at(-1)?.role === 'user';

  let body: ReactNode;
  if (status === 'anonymous') {
    body = (
      <SignInCta
        title="Iniciá sesión para usar el asistente"
        text="El asistente está disponible con tu sesión iniciada. Mientras tanto, podés buscar en las preguntas frecuentes."
      />
    );
  } else if (!authed) {
    body = <Skeleton rows={3} height={18} />;
  } else {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.length === 0 && (
          <p style={{ ...bodyStyle, margin: 0 }}>
            Hola, soy el asistente virtual de La 33. Preguntame cómo usar la plataforma: tu cuenta, la verificación de identidad, las inversiones o los pagos.
          </p>
        )}
        <div role="log" aria-live="polite" aria-label="Conversación con el asistente" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map(m => (
            <Bubble key={m.id} role={m.role}>
              {paragraphs(m.content).map((p, i) => (
                <p key={i} style={{ margin: i ? '8px 0 0' : 0, whiteSpace: 'pre-line' }}>{p}</p>
              ))}
            </Bubble>
          ))}
        </div>
        {pending && (
          <Bubble role="assistant">
            <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 20 }}>
              <span style={srOnly}>El asistente está escribiendo…</span>
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  aria-hidden="true"
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ter)' }}
                />
              ))}
            </span>
          </Bubble>
        )}
        {error?.kind === 'unavailable' && (
          <Notice tone="warn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>{error.text}</span>
            <PBtn variant="secondary" small onClick={() => onOpenTicket(lastUser)}>Abrir un ticket</PBtn>
          </Notice>
        )}
        {error?.kind === 'other' && (
          <Notice tone="error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>{error.text}</span>
            {awaitingReply && !pending && <PBtn variant="secondary" small onClick={() => void ask(messages)}>Reintentar</PBtn>}
          </Notice>
        )}
        <div ref={endRef} />
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asistente de La 33"
      width={560}
      footer={
        authed ? (
          <div style={{ flex: '1 1 100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Field label="Tu consulta" htmlFor={inputId}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <TextArea
                  id={inputId}
                  value={input}
                  rows={2}
                  maxLength={ASSISTANT_MAX_CHARS}
                  placeholder="Escribí tu consulta…"
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  style={{ flex: 1, width: 'auto', minWidth: 0, resize: 'none' }}
                />
                <PBtn variant="accent" small onClick={send} disabled={pending || !input.trim()}>Enviar</PBtn>
              </div>
            </Field>
            <div style={{ ...mutedStyle, fontSize: 11.5 }}>Respuestas automáticas: pueden contener errores. No compartas datos sensibles.</div>
          </div>
        ) : undefined
      }
    >
      {body}
    </Modal>
  );
}
