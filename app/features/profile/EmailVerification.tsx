import { useId, useState } from 'react';
import { PBtn, PTag } from '~/components/ui';
import { api, isProblem } from '~/lib/api/client';
import { useSession } from '~/lib/session';
import { call, errorText, problemReason } from './api';
import { Notice, TextInput } from './kit';
import { emailCode } from './schema';
import { mutedStyle } from './styles';

// Email verification (6-digit code by email). The API answers 503 email_unavailable
// when outgoing email is not configured: that is shown as a calm note, not an error.

const REASONS: Record<string, string> = {
  no_email: 'Guarda primero un email en tu perfil.',
  already_verified: 'Tu email ya está verificado.',
  code_expired: 'El código venció o no fue solicitado. Pide uno nuevo.',
  too_many_attempts: 'Demasiados intentos. Pide un código nuevo.',
  email_changed: 'Tu email cambió mientras lo verificabas. Pide un código nuevo.',
};

export default function EmailVerification() {
  const { user, refresh } = useSession();
  const codeId = useId();
  const [sent, setSent] = useState<{ to: string; minutes: number } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'send' | 'confirm' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  if (!user?.email) return null;
  if (user.emailVerified) return <PTag label="Email verificado ✓" color="green" />;

  async function send() {
    setBusy('send');
    setError(null);
    const { data, error: e } = await call(api.POST('/v1/me/email/verification'));
    setBusy(null);
    if (data) {
      setSent({ to: data.sentTo, minutes: Math.max(1, Math.round(data.expiresInSeconds / 60)) });
      return;
    }
    const reason = problemReason(e);
    if (reason === 'email_unavailable') return setUnavailable(true);
    if (reason === 'already_verified') await refresh();
    setError(errorText(e, 'No pudimos enviar el código. Prueba de nuevo en unos minutos.', REASONS));
  }

  async function confirm() {
    const parsed = emailCode.safeParse(code.trim());
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Código inválido.');
    setBusy('confirm');
    setError(null);
    const { data, error: e } = await call(api.POST('/v1/me/email/verification/confirm', { body: { code: parsed.data } }));
    setBusy(null);
    if (data) {
      await refresh();
      return;
    }
    if (problemReason(e) === 'invalid_code') {
      const left = isProblem(e) && typeof e.attemptsLeft === 'number' ? e.attemptsLeft : null;
      return setError(`Código incorrecto.${left !== null ? ` Te quedan ${left} intento${left === 1 ? '' : 's'}.` : ''}`);
    }
    setError(errorText(e, 'No pudimos confirmar el código.', REASONS));
  }

  if (unavailable) {
    return <Notice tone="info">El envío de emails no está disponible por ahora. Vas a poder verificar tu email más adelante.</Notice>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!sent ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={mutedStyle}>Tu email todavía no está verificado.</span>
          <PBtn variant="secondary" small onClick={e => { e.preventDefault(); void send(); }} disabled={busy !== null}>{busy === 'send' ? 'Enviando…' : 'Enviar código'}</PBtn>
        </div>
      ) : (
        <>
          <div role="status" style={mutedStyle}>
            Te enviamos un código de 6 dígitos a <strong style={{ color: 'var(--text)' }}>{sent.to}</strong>. Vence en {sent.minutes} minutos.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label htmlFor={codeId} className="sr-only">Código de verificación</label>
            <TextInput
              id={codeId}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void confirm();
                }
              }}
              style={{ width: 140, letterSpacing: '0.3em', fontWeight: 600 }}
            />
            <PBtn variant="accent" small onClick={e => { e.preventDefault(); void confirm(); }} disabled={busy !== null || code.length !== 6}>{busy === 'confirm' ? 'Verificando…' : 'Confirmar'}</PBtn>
            <PBtn variant="ghost" small onClick={e => { e.preventDefault(); void send(); }} disabled={busy !== null}>Reenviar</PBtn>
          </div>
        </>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
