import { useId, useState } from 'react';
import { PBtn, PTag } from '~/components/ui';
import { api, isProblem } from '~/lib/api/client';
import { useT } from '~/i18n/useT';
import { useSession } from '~/lib/session';
import { call, errorText, problemReason } from './api';
import { Notice, TextInput } from './kit';
import { emailCode } from './schema';
import { mutedStyle } from './styles';

// Email verification (6-digit code by email). The API answers 503 email_unavailable
// when outgoing email is not configured: that is shown as a calm note, not an error.

const REASONS = ['no_email', 'already_verified', 'code_expired', 'too_many_attempts', 'email_changed'] as const;

export default function EmailVerification() {
  const { t } = useT('profile');
  const { user, refresh } = useSession();
  const reasons: Record<string, string> = Object.fromEntries(REASONS.map(r => [r, t(`email.reasons.${r}`)]));
  const codeId = useId();
  const [sent, setSent] = useState<{ to: string; minutes: number } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'send' | 'confirm' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  if (!user?.email) return null;
  if (user.emailVerified) return <PTag label={t('email.verified')} color="green" />;

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
    setError(errorText(e, t('email.sendError'), reasons, t));
  }

  async function confirm() {
    const parsed = emailCode.safeParse(code.trim());
    if (!parsed.success) return setError(t(parsed.error.issues[0]?.message ?? 'validation.codeInvalid'));
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
      return setError(left === null ? t('email.wrongCode') : t(left === 1 ? 'email.wrongCodeAttemptsOne' : 'email.wrongCodeAttemptsOther', { count: left }));
    }
    setError(errorText(e, t('email.confirmError'), reasons, t));
  }

  if (unavailable) {
    return <Notice tone="info">{t('email.unavailable')}</Notice>;
  }

  // "… a {{to}}. Vence en …": the address is bold, so the sentence is split around it.
  const sentText = sent ? t('email.sent', { minutes: sent.minutes }).split('{{to}}') : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!sent ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={mutedStyle}>{t('email.notVerified')}</span>
          <PBtn variant="secondary" small onClick={e => { e.preventDefault(); void send(); }} disabled={busy !== null}>{busy === 'send' ? t('email.sending') : t('email.send')}</PBtn>
        </div>
      ) : (
        <>
          <div role="status" style={mutedStyle}>
            {sentText[0]}<strong style={{ color: 'var(--text)' }}>{sent.to}</strong>{sentText[1]}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label htmlFor={codeId} className="sr-only">{t('email.codeLabel')}</label>
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
            <PBtn variant="accent" small onClick={e => { e.preventDefault(); void confirm(); }} disabled={busy !== null || code.length !== 6}>{busy === 'confirm' ? t('email.verifying') : t('email.confirm')}</PBtn>
            <PBtn variant="ghost" small onClick={e => { e.preventDefault(); void send(); }} disabled={busy !== null}>{t('email.resend')}</PBtn>
          </div>
        </>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
