import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Icons, PBtn, PCard, PInput, PSection, PTag } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { COUNTRY_NAMES, COUNTRY_OPTIONS, type CountryCode } from '~/lib/countries';
import { useSession, type SessionUser } from '~/lib/session';
import { TERMS_VERSION } from '~/pages/legal-content';
import CompanyFields from '~/features/company/CompanyFields';
import { emptyCompanyForm, parseCompanyForm, saveCompany, type CompanyErrors, type CompanyForm, type MyCompany } from '~/features/company/company';
import { confirmError, isAlreadyVerified, needsNewCode, onboardingError, sendOutcome, type SendOutcome } from './messages';
import { useT, type Translator } from '~/i18n/useT';

// First-login onboarding (live mode): profile + terms (+ the company, for
// company accounts) → optional email verification → suggestion to complete
// the KYC (or the company's KYB).
// Copy: `help:onboarding.*` (validation messages below are dictionary keys).

type OnboardedUser = paths['/v1/me/onboarding']['post']['responses'][200]['content']['application/json'];
type Step = 'profile' | 'email' | 'done';
type Usage = 'person' | 'company';

const COUNTRY_CODES = COUNTRY_OPTIONS.map(([code]) => code) as [CountryCode, ...CountryCode[]];

const profileSchema = z.object({
  displayName: z.string().trim()
    .min(2, 'onboarding.errors.nameMin')
    .max(80, 'onboarding.errors.nameMax')
    .regex(/^[^\p{Cc}]+$/u, 'onboarding.errors.nameChars'),
  email: z.string().trim().min(1, 'onboarding.errors.emailRequired').max(200, 'onboarding.errors.emailTooLong').pipe(z.email('onboarding.errors.emailInvalid')),
  country: z.enum(COUNTRY_CODES, 'onboarding.errors.country'),
  acceptTerms: z.literal(true, 'onboarding.errors.terms'),
});

type ProfileField = 'displayName' | 'email' | 'country' | 'acceptTerms';
type ProfileForm = { displayName: string; email: string; country: CountryCode | ''; acceptTerms: boolean };

const labelText: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--sec)' };
const helpText: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.6, margin: 0 };
const errorText: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)' };
const linkStyle: CSSProperties = { color: 'var(--text)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 };
const selectStyle: CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, padding: '12px 16px', border: '1.5px solid var(--border)', width: '100%',
  boxSizing: 'border-box', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', outline: 'none', cursor: 'pointer',
};
const titleStyle: CSSProperties = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' };

function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" style={{ padding: '11px 14px', borderRadius: 12, background: 'var(--neg-bg)', color: 'var(--neg)', fontFamily: 'var(--font-b)', fontSize: 13, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div role="status" style={{ padding: '13px 16px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border-l)', color: 'var(--sec)', fontFamily: 'var(--font-b)', fontSize: 13.5, lineHeight: 1.55 }}>
      {children}
    </div>
  );
}

/** Step order; labels are `help:onboarding.steps.<id>`. */
const STEPS: readonly Step[] = ['profile', 'email', 'done'];

function Steps({ step }: { step: Step }) {
  const { t } = useT('help');
  const current = STEPS.indexOf(step);
  return (
    <ol aria-label={t('onboarding.stepsLabel')} style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {STEPS.map((id, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={id} aria-current={active ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 700,
              background: active || done ? 'var(--accent)' : 'var(--surface2)', color: active || done ? 'var(--accent-fg)' : 'var(--ter)',
            }}>{done ? Icons.check : i + 1}</span>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--text)' : 'var(--ter)' }}>{t(`onboarding.steps.${id}`)}</span>
            {i < STEPS.length - 1 && <span aria-hidden="true" style={{ width: 22, height: 1, background: 'var(--border)', marginLeft: 2 }} />}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Step 1: profile and terms ──────────────────────────────────────────────

/** Account usages; copy is `help:onboarding.usage.<id>.title` / `.text`. */
const USAGES: readonly Usage[] = ['person', 'company'];

function UsageChoice({ value, onChange }: { value: Usage; onChange: (u: Usage) => void }) {
  const isMobile = useMobile();
  const { t } = useT('help');
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <legend style={{ ...labelText, padding: 0, marginBottom: 8 }}>{t('onboarding.usage.legend')}</legend>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
        {USAGES.map(id => {
          const active = value === id;
          return (
            <label key={id} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '12px 14px', borderRadius: 12,
              border: `1.5px solid ${active ? 'var(--text)' : 'var(--border)'}`, background: active ? 'var(--surface2)' : 'var(--surface)',
            }}>
              <input type="radio" name="usage" value={id} checked={active} onChange={() => onChange(id)}
                style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0, cursor: 'pointer' }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t(`onboarding.usage.${id}.title`)}</span>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', lineHeight: 1.45 }}>{t(`onboarding.usage.${id}.text`)}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ProfileStep({ user, onSaved }: { user: SessionUser; onSaved: (u: OnboardedUser, company: MyCompany | null) => void }) {
  const isMobile = useMobile();
  const { t } = useT('help');
  const { t: tp } = useT('profile');
  const countryId = useId();
  const [form, setForm] = useState<ProfileForm>(() => ({
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    country: user.country && user.country in COUNTRY_NAMES ? (user.country as CountryCode) : '',
    acceptTerms: false,
  }));
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const [usage, setUsage] = useState<Usage>('person');
  const [company, setCompany] = useState<CompanyForm>(() => emptyCompanyForm(user.country));
  const [companyErrors, setCompanyErrors] = useState<CompanyErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const parsed = profileSchema.safeParse(form);
    const companyParsed = usage === 'company' ? parseCompanyForm(company, tp) : null;
    setCompanyErrors(companyParsed?.errors ?? {});
    if (!parsed.success) {
      const next: Partial<Record<ProfileField, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === 'displayName' || key === 'email' || key === 'country' || key === 'acceptTerms') && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    if (companyParsed?.errors) return;
    setApiError(null);
    setSaving(true);
    try {
      const { data, error } = await api.POST('/v1/me/onboarding', { body: { ...parsed.data, termsVersion: TERMS_VERSION } });
      if (!data) {
        setApiError(onboardingError(t, error));
        return;
      }
      // Company accounts: the profile is saved first; a failed registration can be retried from this same step.
      if (companyParsed?.body) {
        const saved = await saveCompany(companyParsed.body, company.logo, null, tp);
        if (!saved.company) {
          setApiError(saved.error);
          return;
        }
        onSaved(data, saved.company);
        return;
      }
      onSaved(data, null);
    } catch {
      setApiError(onboardingError(t, null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 style={titleStyle}>{t('onboarding.profile.title')}</h2>
        <p style={helpText}>{t('onboarding.profile.help')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={labelText}>{t('onboarding.profile.name')}</span>
          <PInput name="displayName" autoComplete="name" maxLength={80} ariaLabel={t('onboarding.profile.name')} placeholder={t('onboarding.profile.namePlaceholder')} value={form.displayName} onChange={e => set('displayName', e.target.value)} />
          {errors.displayName && <span role="alert" style={errorText}>{t(errors.displayName)}</span>}
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={labelText}>{t('onboarding.profile.email')}</span>
          <PInput name="email" type="email" autoComplete="email" maxLength={200} ariaLabel={t('onboarding.profile.email')} placeholder={t('onboarding.profile.emailPlaceholder')} value={form.email} onChange={e => set('email', e.target.value)} />
          {errors.email && <span role="alert" style={errorText}>{t(errors.email)}</span>}
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor={countryId} style={labelText}>{t('onboarding.profile.country')}</label>
        <select id={countryId} name="country" autoComplete="country" value={form.country} onChange={e => set('country', e.target.value in COUNTRY_NAMES ? (e.target.value as CountryCode) : '')} style={{ ...selectStyle, color: form.country ? 'var(--text)' : 'var(--ter)' }}>
          <option value="" disabled>{t('onboarding.profile.countryPlaceholder')}</option>
          {COUNTRY_OPTIONS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
        {errors.country && <span role="alert" style={errorText}>{t(errors.country)}</span>}
      </div>

      <UsageChoice value={usage} onChange={setUsage} />

      {usage === 'company' && (
        <section aria-label={t('onboarding.profile.companySection')} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h3 style={{ ...titleStyle, fontSize: 16 }}>{t('onboarding.profile.companySection')}</h3>
            <p style={{ ...helpText, fontSize: 13 }}>{t('onboarding.profile.companyHelp')}</p>
          </div>
          <CompanyFields form={company} errors={companyErrors}
            onChange={(key, value) => { setCompany(c => ({ ...c, [key]: value })); setCompanyErrors(er => ({ ...er, [key]: undefined })); }} />
        </section>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.5 }}>
          <input
            type="checkbox"
            name="acceptTerms"
            checked={form.acceptTerms}
            onChange={e => set('acceptTerms', e.target.checked)}
            style={{ width: 17, height: 17, marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0, cursor: 'pointer' }}
          />
          <span>
            {t('onboarding.profile.termsBefore')}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" style={linkStyle}>{t('onboarding.profile.terms')}</a>
            {t('onboarding.profile.termsMiddle')}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={linkStyle}>{t('onboarding.profile.privacy')}</a>
            {t('onboarding.profile.termsAfter')}
          </span>
        </label>
        {errors.acceptTerms && <span role="alert" style={errorText}>{t(errors.acceptTerms)}</span>}
      </div>

      {apiError && <Alert>{apiError}</Alert>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PBtn variant="accent" disabled={saving} style={isMobile ? { width: '100%' } : undefined}>{saving ? t('onboarding.profile.saving') : t('onboarding.profile.continue')}</PBtn>
      </div>
    </form>
  );
}

// ─── Step 2: email verification (optional) ──────────────────────────────────

type SendState = SendOutcome | { kind: 'sending' };

async function requestCode(t: Translator['t']): Promise<SendOutcome> {
  try {
    const { data, error } = await api.POST('/v1/me/email/verification');
    return data ? { kind: 'sent', sentTo: data.sentTo, expiresInSeconds: data.expiresInSeconds } : sendOutcome(t, error);
  } catch {
    return sendOutcome(t, null);
  }
}

function EmailStep({ email, onDone }: { email: string; onDone: () => void }) {
  const isMobile = useMobile();
  const { t } = useT('help');
  const { refresh } = useSession();
  const [send, setSend] = useState<SendState>({ kind: 'sending' });
  // The code form appears only once a code was really sent (no flash while the first request is in flight).
  const [codeRequested, setCodeRequested] = useState(false);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const started = useRef(false);
  const latest = useRef({ refresh, onDone, t });
  useEffect(() => {
    latest.current = { refresh, onDone, t };
  });

  const finishVerified = async () => {
    await latest.current.refresh();
    latest.current.onDone();
  };

  // The first code is sent as soon as the step opens (once, even under StrictMode).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void requestCode(latest.current.t).then(outcome => {
      setSend(outcome);
      if (outcome.kind === 'sent') setCodeRequested(true);
      if (outcome.kind === 'verified') void latest.current.refresh().then(() => latest.current.onDone());
    });
  }, []);

  // A new code can be requested 30 s after the last one was sent.
  useEffect(() => {
    if (send.kind !== 'sent') return;
    const timer = window.setTimeout(() => setCanResend(true), 30_000);
    return () => window.clearTimeout(timer);
  }, [send]);

  async function resend() {
    setCanResend(false);
    setError(null);
    setCode('');
    setSend({ kind: 'sending' });
    const outcome = await requestCode(t);
    setSend(outcome);
    if (outcome.kind === 'verified') await finishVerified();
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (checking) return;
    if (!/^\d{6}$/.test(code)) {
      setError(t('onboarding.email.enterCode'));
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const { data, error: problem } = await api.POST('/v1/me/email/verification/confirm', { body: { code } });
      if (data || isAlreadyVerified(problem)) {
        await finishVerified();
        return;
      }
      setError(confirmError(t, problem));
      if (needsNewCode(problem)) {
        setCode('');
        setCanResend(true);
      }
    } catch {
      setError(confirmError(t, null));
    } finally {
      setChecking(false);
    }
  }

  const header = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <h2 style={titleStyle}>{t('onboarding.email.title')}</h2>
      <p style={helpText}>{t('onboarding.email.helpBefore')}<strong style={{ color: 'var(--text)', overflowWrap: 'anywhere' }}>{email || t('onboarding.email.yourEmail')}</strong>{t('onboarding.email.helpAfter')}</p>
    </div>
  );

  if (send.kind === 'sending' && !codeRequested) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {header}
        <Note>{t('onboarding.email.preparing')}</Note>
      </div>
    );
  }

  if (send.kind === 'unavailable') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {header}
        <Note>{t('onboarding.email.unavailable')}</Note>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <PBtn variant="accent" onClick={onDone} style={isMobile ? { width: '100%' } : undefined}>{t('onboarding.email.continue')}</PBtn>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {header}

      {send.kind === 'sending' && <Note>{t('onboarding.email.sending')}</Note>}
      {send.kind === 'sent' && (
        <p style={{ ...helpText, fontSize: 13 }}>
          {t('onboarding.email.sentBefore')}<strong style={{ color: 'var(--text)' }}>{send.sentTo}</strong>{t('onboarding.email.sentAfter', { minutes: Math.max(1, Math.round(send.expiresInSeconds / 60)) })}
        </p>
      )}
      {send.kind === 'error' && <Alert>{send.message}</Alert>}

      {send.kind !== 'error' && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: isMobile ? undefined : 260 }}>
          <span style={labelText}>{t('onboarding.email.codeLabel')}</span>
          <PInput
            name="code"
            type="tel"
            autoComplete="one-time-code"
            maxLength={6}
            ariaLabel={t('onboarding.email.codeAria')}
            placeholder="000000"
            value={code}
            onChange={e => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            style={{ letterSpacing: '0.35em', fontSize: 20, fontWeight: 600, textAlign: 'center' }}
          />
        </label>
      )}

      {error && <Alert>{error}</Alert>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
        <PBtn variant="ghost" onClick={e => { e.preventDefault(); onDone(); }} style={isMobile ? { width: '100%' } : undefined}>{t('onboarding.email.skip')}</PBtn>
        {send.kind === 'error' ? (
          <PBtn variant="secondary" onClick={e => { e.preventDefault(); void resend(); }} style={isMobile ? { width: '100%' } : undefined}>{t('shared.retry')}</PBtn>
        ) : (
          <PBtn variant="secondary" disabled={!canResend || send.kind === 'sending'} onClick={e => { e.preventDefault(); void resend(); }} style={isMobile ? { width: '100%' } : undefined}>
            {t('onboarding.email.resend')}
          </PBtn>
        )}
        {send.kind !== 'error' && (
          <PBtn variant="accent" disabled={checking || send.kind === 'sending' || code.length !== 6} style={isMobile ? { width: '100%' } : undefined}>
            {checking ? t('onboarding.email.verifying') : t('onboarding.email.verify')}
          </PBtn>
        )}
      </div>
    </form>
  );
}

// ─── Step 3: done ───────────────────────────────────────────────────────────

function CompanyDone({ company, onFinish }: { company: MyCompany; onFinish: (path: string) => void }) {
  const isMobile = useMobile();
  const { t } = useT('help');
  const full = isMobile ? { width: '100%' } : undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.check}</span>
        <h2 style={titleStyle}>{t('onboarding.done.companyTitle', { name: company.name })}</h2>
        <p style={helpText}>{t('onboarding.done.companyText')}</p>
      </div>
      <Note>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <PTag label={t('onboarding.done.pendingTag')} color="blue" />
          {t('onboarding.done.pendingNote')}
        </span>
      </Note>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
        <PBtn variant="secondary" onClick={() => onFinish('/panel')} style={full}>{t('onboarding.done.toPanel')}</PBtn>
        <PBtn variant="accent" onClick={() => onFinish('/perfil?seccion=empresa')} style={full}>{t('onboarding.done.completeKyb')}</PBtn>
      </div>
    </div>
  );
}

function DoneStep({ user, onFinish }: { user: SessionUser; onFinish: (path: string) => void }) {
  const isMobile = useMobile();
  const { t } = useT('help');
  const name = user.displayName?.trim();
  const needsKyc = user.kycStatus === 'none' || user.kycStatus === 'rejected';
  const full = isMobile ? { width: '100%' } : undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.check}</span>
        <h2 style={titleStyle}>{name ? t('onboarding.done.titleNamed', { name }) : t('onboarding.done.title')}</h2>
        <p style={helpText}>
          {user.emailVerified ? t('onboarding.done.configuredVerified') : t('onboarding.done.configured')}{' '}
          {needsKyc
            ? t('onboarding.done.needsKyc')
            : user.kycStatus === 'pending'
              ? t('onboarding.done.kycPending')
              : t('onboarding.done.kycDone')}
        </p>
      </div>
      {needsKyc && (
        <Note>
          <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <PTag label={t('onboarding.done.kycTag')} color="neutral" />
            {t('onboarding.done.kycNote')}
          </span>
        </Note>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
        {needsKyc ? (
          <>
            <PBtn variant="secondary" onClick={() => onFinish('/panel')} style={full}>{t('onboarding.done.toPanel')}</PBtn>
            <PBtn variant="accent" onClick={() => onFinish('/perfil')} style={full}>{t('onboarding.done.completeKyc')}</PBtn>
          </>
        ) : (
          <PBtn variant="accent" onClick={() => onFinish('/panel')} style={full}>{t('onboarding.done.toPanel')}</PBtn>
        )}
      </div>
    </div>
  );
}

// ─── Flow ───────────────────────────────────────────────────────────────────

type Props = {
  user: SessionUser;
  /** Called once the profile is saved, before the session refresh marks the user as onboarded. */
  onStarted: () => void;
  /** Called when the user leaves the flow (the gated page is shown again). */
  onFinished: () => void;
};

export default function Onboarding({ user, onStarted, onFinished }: Props) {
  const isMobile = useMobile();
  const { t } = useT('help');
  const navigate = useNavigate();
  const { refresh } = useSession();
  const [step, setStep] = useState<Step>(user.onboarded && !user.emailVerified ? 'email' : 'profile');
  const [email, setEmail] = useState(user.email ?? '');
  const [company, setCompany] = useState<MyCompany | null>(null);

  const onSaved = (saved: OnboardedUser, registered: MyCompany | null) => {
    onStarted();
    setCompany(registered);
    setEmail(saved.email ?? '');
    setStep(saved.emailVerified ? 'done' : 'email');
    void refresh();
  };

  const finish = (path: string) => {
    navigate(path);
    onFinished();
  };

  return (
    // data-guide-block: guided tours wait until the onboarding flow is over.
    <div className="g-page" data-guide-block="" style={{ padding: '28px 32px 40px', maxWidth: 640, margin: '0 auto' }}>
      <PSection title={t('onboarding.title')} sub={t('onboarding.sub')} />
      <Steps step={step} />
      <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <PCard style={{ padding: isMobile ? '22px 18px' : '28px 30px' }}>
          {step === 'profile' && <ProfileStep user={user} onSaved={onSaved} />}
          {step === 'email' && <EmailStep email={email} onDone={() => setStep('done')} />}
          {step === 'done' && (company ? <CompanyDone company={company} onFinish={finish} /> : <DoneStep user={user} onFinish={finish} />)}
        </PCard>
      </motion.div>
    </div>
  );
}
