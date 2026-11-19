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

// First-login onboarding (live mode): profile + terms (+ the company, for
// company accounts) → optional email verification → suggestion to complete
// the KYC (or the company's KYB).

type OnboardedUser = paths['/v1/me/onboarding']['post']['responses'][200]['content']['application/json'];
type Step = 'profile' | 'email' | 'done';
type Usage = 'person' | 'company';

const COUNTRY_CODES = COUNTRY_OPTIONS.map(([code]) => code) as [CountryCode, ...CountryCode[]];

const profileSchema = z.object({
  displayName: z.string().trim()
    .min(2, 'Ingresá al menos 2 caracteres.')
    .max(80, 'Usá como máximo 80 caracteres.')
    .regex(/^[^\p{Cc}]+$/u, 'El nombre tiene caracteres no permitidos.'),
  email: z.string().trim().min(1, 'Ingresá tu email.').max(200, 'El email es demasiado largo.').pipe(z.email('Ingresá un email válido.')),
  country: z.enum(COUNTRY_CODES, 'Elegí tu país.'),
  acceptTerms: z.literal(true, 'Tenés que aceptar los Términos y la Política de privacidad.'),
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

const STEPS: ReadonlyArray<readonly [Step, string]> = [['profile', 'Tus datos'], ['email', 'Email'], ['done', 'Listo']];

function Steps({ step }: { step: Step }) {
  const current = STEPS.findIndex(([id]) => id === step);
  return (
    <ol aria-label="Pasos" style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {STEPS.map(([id, label], i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={id} aria-current={active ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-b)', fontSize: 11.5, fontWeight: 700,
              background: active || done ? 'var(--accent)' : 'var(--surface2)', color: active || done ? 'var(--accent-fg)' : 'var(--ter)',
            }}>{done ? Icons.check : i + 1}</span>
            <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--text)' : 'var(--ter)' }}>{label}</span>
            {i < STEPS.length - 1 && <span aria-hidden="true" style={{ width: 22, height: 1, background: 'var(--border)', marginLeft: 2 }} />}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Step 1: profile and terms ──────────────────────────────────────────────

const USAGES: ReadonlyArray<readonly [Usage, string, string]> = [
  ['person', 'Persona', 'Invierto en activos reales con mi wallet.'],
  ['company', 'Empresa', 'Registro mi empresa para tokenizar sus activos.'],
];

function UsageChoice({ value, onChange }: { value: Usage; onChange: (u: Usage) => void }) {
  const isMobile = useMobile();
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <legend style={{ ...labelText, padding: 0, marginBottom: 8 }}>¿Cómo vas a usar La 33?</legend>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
        {USAGES.map(([id, title, text]) => {
          const active = value === id;
          return (
            <label key={id} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '12px 14px', borderRadius: 12,
              border: `1.5px solid ${active ? 'var(--text)' : 'var(--border)'}`, background: active ? 'var(--surface2)' : 'var(--surface)',
            }}>
              <input type="radio" name="usage" value={id} checked={active} onChange={() => onChange(id)}
                style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0, cursor: 'pointer' }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--sec)', lineHeight: 1.45 }}>{text}</span>
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
    const companyParsed = usage === 'company' ? parseCompanyForm(company) : null;
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
        setApiError(onboardingError(error));
        return;
      }
      // Company accounts: the profile is saved first; a failed registration can be retried from this same step.
      if (companyParsed?.body) {
        const saved = await saveCompany(companyParsed.body, company.logo, null);
        if (!saved.company) {
          setApiError(saved.error);
          return;
        }
        onSaved(data, saved.company);
        return;
      }
      onSaved(data, null);
    } catch {
      setApiError(onboardingError(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 style={titleStyle}>Contanos quién sos</h2>
        <p style={helpText}>Usamos estos datos para tu cuenta y para avisarte sobre tus inversiones. Podés cambiarlos después desde tu perfil.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={labelText}>Nombre</span>
          <PInput name="displayName" autoComplete="name" maxLength={80} ariaLabel="Nombre" placeholder="Cómo querés que te llamemos" value={form.displayName} onChange={e => set('displayName', e.target.value)} />
          {errors.displayName && <span role="alert" style={errorText}>{errors.displayName}</span>}
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={labelText}>Email</span>
          <PInput name="email" type="email" autoComplete="email" maxLength={200} ariaLabel="Email" placeholder="vos@ejemplo.com" value={form.email} onChange={e => set('email', e.target.value)} />
          {errors.email && <span role="alert" style={errorText}>{errors.email}</span>}
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor={countryId} style={labelText}>País de residencia</label>
        <select id={countryId} name="country" autoComplete="country" value={form.country} onChange={e => set('country', e.target.value in COUNTRY_NAMES ? (e.target.value as CountryCode) : '')} style={{ ...selectStyle, color: form.country ? 'var(--text)' : 'var(--ter)' }}>
          <option value="" disabled>Seleccioná tu país</option>
          {COUNTRY_OPTIONS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
        {errors.country && <span role="alert" style={errorText}>{errors.country}</span>}
      </div>

      <UsageChoice value={usage} onChange={setUsage} />

      {usage === 'company' && (
        <section aria-label="Datos de la empresa" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h3 style={{ ...titleStyle, fontSize: 16 }}>Datos de la empresa</h3>
            <p style={{ ...helpText, fontSize: 13 }}>La revisamos junto con la verificación de empresa (KYB). Hasta que la aprobemos, su página no es pública.</p>
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
            Acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer" style={linkStyle}>Términos</a> y la{' '}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={linkStyle}>Política de privacidad</a>.
          </span>
        </label>
        {errors.acceptTerms && <span role="alert" style={errorText}>{errors.acceptTerms}</span>}
      </div>

      {apiError && <Alert>{apiError}</Alert>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PBtn variant="accent" disabled={saving} style={isMobile ? { width: '100%' } : undefined}>{saving ? 'Guardando…' : 'Continuar'}</PBtn>
      </div>
    </form>
  );
}

// ─── Step 2: email verification (optional) ──────────────────────────────────

type SendState = SendOutcome | { kind: 'sending' };

async function requestCode(): Promise<SendOutcome> {
  try {
    const { data, error } = await api.POST('/v1/me/email/verification');
    return data ? { kind: 'sent', sentTo: data.sentTo, expiresInSeconds: data.expiresInSeconds } : sendOutcome(error);
  } catch {
    return sendOutcome(null);
  }
}

function EmailStep({ email, onDone }: { email: string; onDone: () => void }) {
  const isMobile = useMobile();
  const { refresh } = useSession();
  const [send, setSend] = useState<SendState>({ kind: 'sending' });
  // The code form appears only once a code was really sent (no flash while the first request is in flight).
  const [codeRequested, setCodeRequested] = useState(false);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const started = useRef(false);
  const latest = useRef({ refresh, onDone });
  useEffect(() => {
    latest.current = { refresh, onDone };
  });

  const finishVerified = async () => {
    await latest.current.refresh();
    latest.current.onDone();
  };

  // The first code is sent as soon as the step opens (once, even under StrictMode).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void requestCode().then(outcome => {
      setSend(outcome);
      if (outcome.kind === 'sent') setCodeRequested(true);
      if (outcome.kind === 'verified') void latest.current.refresh().then(() => latest.current.onDone());
    });
  }, []);

  // A new code can be requested 30 s after the last one was sent.
  useEffect(() => {
    if (send.kind !== 'sent') return;
    const t = window.setTimeout(() => setCanResend(true), 30_000);
    return () => window.clearTimeout(t);
  }, [send]);

  async function resend() {
    setCanResend(false);
    setError(null);
    setCode('');
    setSend({ kind: 'sending' });
    const outcome = await requestCode();
    setSend(outcome);
    if (outcome.kind === 'verified') await finishVerified();
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (checking) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Ingresá los 6 dígitos del código.');
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
      setError(confirmError(problem));
      if (needsNewCode(problem)) {
        setCode('');
        setCanResend(true);
      }
    } catch {
      setError(confirmError(null));
    } finally {
      setChecking(false);
    }
  }

  const header = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <h2 style={titleStyle}>Verificá tu email</h2>
      <p style={helpText}>Así confirmamos que <strong style={{ color: 'var(--text)', overflowWrap: 'anywhere' }}>{email || 'tu email'}</strong> es tuyo. Es opcional: podés hacerlo más tarde.</p>
    </div>
  );

  if (send.kind === 'sending' && !codeRequested) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {header}
        <Note>Preparando la verificación de tu email…</Note>
      </div>
    );
  }

  if (send.kind === 'unavailable') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {header}
        <Note>La verificación por email estará disponible pronto. Podés seguir usando la plataforma con normalidad.</Note>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <PBtn variant="accent" onClick={onDone} style={isMobile ? { width: '100%' } : undefined}>Continuar</PBtn>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {header}

      {send.kind === 'sending' && <Note>Enviando un código de 6 dígitos…</Note>}
      {send.kind === 'sent' && (
        <p style={{ ...helpText, fontSize: 13 }}>
          Te enviamos un código a <strong style={{ color: 'var(--text)' }}>{send.sentTo}</strong>. Vence en {Math.max(1, Math.round(send.expiresInSeconds / 60))} minutos. Revisá también la carpeta de spam.
        </p>
      )}
      {send.kind === 'error' && <Alert>{send.message}</Alert>}

      {send.kind !== 'error' && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: isMobile ? undefined : 260 }}>
          <span style={labelText}>Código de verificación</span>
          <PInput
            name="code"
            type="tel"
            autoComplete="one-time-code"
            maxLength={6}
            ariaLabel="Código de verificación de 6 dígitos"
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
        <PBtn variant="ghost" onClick={e => { e.preventDefault(); onDone(); }} style={isMobile ? { width: '100%' } : undefined}>Omitir por ahora</PBtn>
        {send.kind === 'error' ? (
          <PBtn variant="secondary" onClick={e => { e.preventDefault(); void resend(); }} style={isMobile ? { width: '100%' } : undefined}>Reintentar</PBtn>
        ) : (
          <PBtn variant="secondary" disabled={!canResend || send.kind === 'sending'} onClick={e => { e.preventDefault(); void resend(); }} style={isMobile ? { width: '100%' } : undefined}>
            Reenviar código
          </PBtn>
        )}
        {send.kind !== 'error' && (
          <PBtn variant="accent" disabled={checking || send.kind === 'sending' || code.length !== 6} style={isMobile ? { width: '100%' } : undefined}>
            {checking ? 'Verificando…' : 'Verificar'}
          </PBtn>
        )}
      </div>
    </form>
  );
}

// ─── Step 3: done ───────────────────────────────────────────────────────────

function CompanyDone({ company, onFinish }: { company: MyCompany; onFinish: (path: string) => void }) {
  const isMobile = useMobile();
  const full = isMobile ? { width: '100%' } : undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.check}</span>
        <h2 style={titleStyle}>Registramos {company.name}</h2>
        <p style={helpText}>Tu empresa quedó pendiente de verificación. Completá la verificación de empresa (KYB) para que podamos aprobarla; mientras tanto ya podés preparar la tokenización de tus activos.</p>
      </div>
      <Note>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <PTag label="Pendiente de verificación" color="blue" />
          Hasta que la aprobemos, la página de la empresa no es pública.
        </span>
      </Note>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
        <PBtn variant="secondary" onClick={() => onFinish('/panel')} style={full}>Ir al panel</PBtn>
        <PBtn variant="accent" onClick={() => onFinish('/perfil?seccion=empresa')} style={full}>Completar KYB</PBtn>
      </div>
    </div>
  );
}

function DoneStep({ user, onFinish }: { user: SessionUser; onFinish: (path: string) => void }) {
  const isMobile = useMobile();
  const name = user.displayName?.trim();
  const needsKyc = user.kycStatus === 'none' || user.kycStatus === 'rejected';
  const full = isMobile ? { width: '100%' } : undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.check}</span>
        <h2 style={titleStyle}>{name ? `¡Listo, ${name}!` : '¡Listo!'}</h2>
        <p style={helpText}>
          {user.emailVerified ? 'Tu cuenta está configurada y tu email verificado.' : 'Tu cuenta está configurada.'}{' '}
          {needsKyc
            ? 'Para invertir necesitás verificar tu identidad (KYC). Te lleva unos minutos y habilita tu wallet on-chain.'
            : user.kycStatus === 'pending'
              ? 'Tu verificación de identidad está en revisión: te avisamos cuando esté lista.'
              : 'Tu identidad ya está verificada: podés empezar a invertir.'}
        </p>
      </div>
      {needsKyc && (
        <Note>
          <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <PTag label="KYC pendiente" color="neutral" />
            Sin KYC podés explorar proyectos, pero no invertir ni cobrar rendimientos.
          </span>
        </Note>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
        {needsKyc ? (
          <>
            <PBtn variant="secondary" onClick={() => onFinish('/panel')} style={full}>Ir al panel</PBtn>
            <PBtn variant="accent" onClick={() => onFinish('/perfil')} style={full}>Completar KYC</PBtn>
          </>
        ) : (
          <PBtn variant="accent" onClick={() => onFinish('/panel')} style={full}>Ir al panel</PBtn>
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
      <PSection title="Bienvenido a La 33" sub="Completá tu perfil para empezar a invertir en activos reales." />
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
