import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PBtn, PCard } from '~/components/ui';
import { call } from '~/features/profile/api';
import { Notice, Select, TextArea, TextInput } from '~/features/profile/kit';
import { bodyStyle, labelStyle } from '~/features/profile/styles';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { COUNTRY_OPTIONS } from '~/lib/countries';
import { fmtCount, fmtMoney, fmtPercent, rejectedFields, submitErrorText, type TokenizationRequestDetail } from './api';
import DocumentsStep from './DocumentsStep';
import FormField from './FormField';
import { examplesFor, tokenomicsHelp } from './examples';
import { categoryLabel, CATEGORY_META, LIVE_STEPS } from './labels';
import {
  CATEGORIES, DESCRIPTION_MAX, DESCRIPTION_MIN, emptyDraft, OTHER_TYPE_MAX, firstStepWith, isDraftField, parseAmount, parseDraft, STEP_FIELDS, validateFields,
  type Category, type Draft, type DraftField, type FieldErrors,
} from './schema';

// Live "Tokenizar activo" wizard: same stepper and card look as the demo, backed by
// POST /v1/tokenization-requests (+ document uploads once the request exists).

const STEP_MOTION = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };
const STEP_TITLE: CSSProperties = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6, outline: 'none' };
const CARD_TITLE: CSSProperties = { fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 20, outline: 'none' };
const CARD_SUB: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)', marginBottom: 20 };
const ERROR_TEXT: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--neg)' };
const INVALID_BORDER: CSSProperties = { borderColor: 'var(--neg)' };
const LINK_BTN: CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--accent-text)' };
const CHECK = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;

type NumField = 'valuation' | 'tokenPrice' | 'totalTokens' | 'expectedApy';

type Props = {
  /** Session data used to prefill the contact step. */
  contactName: string | null;
  contactEmail: string | null;
  /** Switches the page to the "Mis solicitudes" tab. */
  onShowRequests: () => void;
};

export default function RequestForm({ contactName, contactEmail, onShowRequests }: Props) {
  const isMobile = useMobile();
  const base = useId();
  const fid = (f: DraftField) => `${base}-${f}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft({ name: contactName, email: contactEmail }));
  const [prefilled, setPrefilled] = useState(Boolean(contactName || contactEmail));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<TokenizationRequestDetail | null>(null);

  // The session can resolve after the first render: prefill the contact data once.
  if (!prefilled && (contactName || contactEmail)) {
    setPrefilled(true);
    setDraft(d => ({ ...d, contactName: d.contactName || contactName || '', contactEmail: d.contactEmail || contactEmail || '' }));
  }

  const cardPadding = isMobile ? '18px 16px' : '24px';
  const grid = (cols: string): CSSProperties => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : cols, gap: 16 });

  const go = (n: number) => {
    setStep(n);
    const root = rootRef.current;
    if (root && root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const set = <K extends DraftField>(field: K, value: Draft[K]) => {
    setDraft(d => ({ ...d, [field]: value }));
    if (errors[field]) {
      setErrors(e => {
        const { [field]: _cleared, ...rest } = e;
        return rest;
      });
    }
  };

  const next = () => {
    const fields = STEP_FIELDS[step];
    const found = validateFields(draft, fields);
    const first = fields.find(f => found[f]);
    if (!first) return go(step + 1);
    setErrors(e => ({ ...e, ...found }));
    requestAnimationFrame(() => document.getElementById(fid(first))?.focus());
  };

  const submit = async () => {
    if (sendingRef.current) return;
    const parsed = parseDraft(draft);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return go(Math.max(0, firstStepWith(parsed.errors)));
    }
    sendingRef.current = true;
    setSending(true);
    setSubmitError(null);
    const { data, error } = await call(api.POST('/v1/tokenization-requests', { body: parsed.body }));
    sendingRef.current = false;
    setSending(false);
    if (!data) {
      const fields = rejectedFields(error).filter(isDraftField);
      if (fields.length) {
        const found: FieldErrors = {};
        for (const f of fields) found[f] = 'Revisa este dato: el servidor no lo aceptó.';
        setErrors(found);
        return go(Math.max(0, firstStepWith(found)));
      }
      setSubmitError(submitErrorText(error));
      return;
    }
    setErrors({});
    setCreated(data);
    go(5);
  };

  const reset = () => {
    setDraft(emptyDraft({ name: contactName, email: contactEmail }));
    setErrors({});
    setSubmitError(null);
    setCreated(null);
    go(0);
  };

  // Parsed numbers for the live previews (null = empty or not a number yet).
  const num: Record<NumField, number | null> = {
    valuation: parseAmount(draft.valuation),
    tokenPrice: parseAmount(draft.tokenPrice),
    totalTokens: parseAmount(draft.totalTokens),
    expectedApy: parseAmount(draft.expectedApy),
  };
  const numHint = (field: NumField, fallback: string): string => {
    const n = num[field];
    if (n === null || !draft[field].trim()) return fallback;
    if (field === 'totalTokens') return `= ${n.toLocaleString('es-AR', { maximumFractionDigits: 6 })} tokens`;
    if (field === 'expectedApy') return `= ${fmtPercent(n)} anual`;
    return `= ${fmtMoney(n, field === 'tokenPrice' ? 6 : 2)}`;
  };

  // Placeholders, hints and help bubbles follow the chosen asset type.
  const ex = examplesFor(draft.category);
  const help = tokenomicsHelp(ex);

  const numberInput = (field: NumField, placeholder: string, fallbackHint: string, label: string) => (
    <FormField id={fid(field)} label={label} help={help[field]} hint={numHint(field, fallbackHint)} error={errors[field]}>
      {p => (
        <TextInput
          {...p}
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          maxLength={24}
          value={draft[field]}
          onChange={e => set(field, e.target.value)}
          invalid={Boolean(errors[field])}
        />
      )}
    </FormField>
  );

  const review = step === 4 ? parseDraft(draft) : null;
  const body = review?.ok ? review.body : null;

  return (
    <div ref={rootRef} style={{ scrollMarginTop: 16 }}>
      <Stepper current={step} isMobile={isMobile} />

      <AnimatePresence
        mode="wait"
        onExitComplete={() => requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>('[data-step-title]')?.focus())}
      >
        {/* Step 0: asset type */}
        {step === 0 && (
          <motion.div key="s0" {...STEP_MOTION}>
            <h2 id={`${base}-type-title`} data-step-title tabIndex={-1} style={STEP_TITLE}>¿Qué tipo de activo quieres tokenizar?</h2>
            <p style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--sec)', marginBottom: 24 }}>El tipo define la documentación y los datos que revisa el equipo.</p>
            <CategoryPicker
              id={fid('category')}
              labelledBy={`${base}-type-title`}
              value={draft.category}
              onChange={c => set('category', c)}
              error={errors.category}
              isMobile={isMobile}
            />
            {draft.category === 'otro' && (
              <div style={{ marginTop: 20, maxWidth: 480 }}>
                <FormField id={fid('otherType')} label="¿Qué tipo de activo es?" hint="Por ejemplo: velero, maquinaria industrial, obra de arte o licencia de software." error={errors.otherType}>
                  {p => <TextInput {...p} autoComplete="off" maxLength={OTHER_TYPE_MAX} placeholder="Ej: Velero de regata" value={draft.otherType} onChange={e => set('otherType', e.target.value)} invalid={Boolean(errors.otherType)} />}
                </FormField>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
              {!draft.category && <span style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' }}>Elige un tipo de activo para continuar.</span>}
              <PBtn variant="accent" onClick={next} disabled={!draft.category}>Continuar →</PBtn>
            </div>
          </motion.div>
        )}

        {/* Step 1: asset information */}
        {step === 1 && (
          <motion.div key="s1" {...STEP_MOTION}>
            <PCard style={{ padding: cardPadding, marginBottom: 24 }}>
              <h2 data-step-title tabIndex={-1} style={CARD_TITLE}>Información del activo</h2>
              <div style={grid('1fr 1fr')}>
                <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
                  <FormField id={fid('assetName')} label="Nombre del activo" error={errors.assetName}>
                    {p => <TextInput {...p} autoComplete="off" maxLength={120} placeholder={ex.name} value={draft.assetName} onChange={e => set('assetName', e.target.value)} invalid={Boolean(errors.assetName)} />}
                  </FormField>
                </div>
                <FormField id={fid('country')} label="País" error={errors.country}>
                  {p => (
                    <Select {...p} value={draft.country} onChange={e => set('country', e.target.value)} aria-invalid={errors.country ? true : undefined} style={errors.country ? INVALID_BORDER : undefined}>
                      <option value="" disabled>Elige un país</option>
                      {COUNTRY_OPTIONS.map(([code, name]) => <option key={code} value={name}>{name}</option>)}
                    </Select>
                  )}
                </FormField>
                <FormField id={fid('location')} label="Ubicación" hint={ex.locationHint} error={errors.location}>
                  {p => <TextInput {...p} autoComplete="off" maxLength={120} placeholder={ex.location} value={draft.location} onChange={e => set('location', e.target.value)} invalid={Boolean(errors.location)} />}
                </FormField>
                <FormField id={fid('lifespan')} label="Duración estimada" hint='Plazo del proyecto, por ejemplo "5 años" o "36 meses".' error={errors.lifespan}>
                  {p => <TextInput {...p} autoComplete="off" maxLength={60} placeholder={ex.lifespan} value={draft.lifespan} onChange={e => set('lifespan', e.target.value)} invalid={Boolean(errors.lifespan)} />}
                </FormField>
              </div>
              <div style={{ marginTop: 16 }}>
                <FormField
                  id={fid('description')}
                  label="Descripción"
                  aside={<span style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', whiteSpace: 'nowrap' }}>{draft.description.trim().length} / {DESCRIPTION_MAX}</span>}
                  hint={`Mínimo ${DESCRIPTION_MIN} caracteres. ${ex.descriptionHint}`}
                  error={errors.description}
                >
                  {p => (
                    <TextArea
                      {...p}
                      rows={5}
                      maxLength={DESCRIPTION_MAX}
                      placeholder={ex.description}
                      value={draft.description}
                      onChange={e => set('description', e.target.value)}
                      invalid={Boolean(errors.description)}
                    />
                  )}
                </FormField>
              </div>
            </PCard>
            <StepNav onBack={() => go(0)} onNext={next} />
          </motion.div>
        )}

        {/* Step 2: tokenomics */}
        {step === 2 && (
          <motion.div key="s2" {...STEP_MOTION}>
            <PCard style={{ padding: cardPadding, marginBottom: 16 }}>
              <h2 data-step-title tabIndex={-1} style={CARD_TITLE}>Estructura de tokens</h2>
              <div style={grid('1fr 1fr')}>
                {numberInput('valuation', `Ej: ${ex.valuation}`, `En dólares. Ej: ${ex.valuation}`, 'Valuación del activo (USD)')}
                {numberInput('tokenPrice', `Ej: ${ex.tokenPrice}`, 'En dólares, hasta 6 decimales.', 'Precio por token (USD)')}
                {numberInput('totalTokens', `Ej: ${ex.totalTokens}`, 'Número entero, hasta 100.000.000.', 'Cantidad total de tokens')}
                {numberInput('expectedApy', `Ej: ${ex.expectedApy}`, 'Porcentaje anual, de 0 a 100.', 'Rendimiento anual esperado (%)')}
              </div>
              <Capitalization valuation={num.valuation} tokenPrice={num.tokenPrice} totalTokens={num.totalTokens} isMobile={isMobile} />
              <p style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginTop: 14 }}>
                Puedes escribir los montos con puntos de miles y coma decimal (1.500.000,50) o como número simple (1500000.50).
              </p>
            </PCard>
            <StepNav onBack={() => go(1)} onNext={next} />
          </motion.div>
        )}

        {/* Step 3: contact */}
        {step === 3 && (
          <motion.div key="s3" {...STEP_MOTION}>
            <PCard style={{ padding: cardPadding, marginBottom: 16 }}>
              <h2 data-step-title tabIndex={-1} style={{ ...CARD_TITLE, marginBottom: 6 }}>Datos de contacto</h2>
              <p style={CARD_SUB}>Los usamos solo para coordinar la revisión de tu solicitud.</p>
              <div style={grid('1fr 1fr')}>
                <FormField id={fid('contactName')} label="Nombre y apellido" error={errors.contactName}>
                  {p => <TextInput {...p} autoComplete="name" maxLength={120} value={draft.contactName} onChange={e => set('contactName', e.target.value)} invalid={Boolean(errors.contactName)} />}
                </FormField>
                <FormField id={fid('contactEmail')} label="Email" error={errors.contactEmail}>
                  {p => <TextInput {...p} type="email" inputMode="email" autoComplete="email" maxLength={200} value={draft.contactEmail} onChange={e => set('contactEmail', e.target.value)} invalid={Boolean(errors.contactEmail)} />}
                </FormField>
                <FormField id={fid('contactPhone')} label="Teléfono (opcional)" hint="Con código de país, por ejemplo +54 9 11 5555-5555." error={errors.contactPhone}>
                  {p => <TextInput {...p} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={draft.contactPhone} onChange={e => set('contactPhone', e.target.value)} invalid={Boolean(errors.contactPhone)} />}
                </FormField>
              </div>
            </PCard>
            <StepNav onBack={() => go(2)} onNext={next} />
          </motion.div>
        )}

        {/* Step 4: review + submit */}
        {step === 4 && (
          <motion.div key="s4" {...STEP_MOTION}>
            <PCard style={{ padding: cardPadding, marginBottom: 16 }}>
              <h2 data-step-title tabIndex={-1} style={CARD_TITLE}>Revisa tu solicitud</h2>
              {body ? (
                <>
                  <ReviewGroup
                    title="Activo"
                    onEdit={() => go(1)}
                    isMobile={isMobile}
                    rows={[
                      ['Tipo de activo', categoryLabel(body)],
                      ['Nombre', body.assetName],
                      ['País', body.country],
                      ['Ubicación', body.location],
                      ['Duración estimada', body.lifespan],
                    ]}
                  >
                    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-l)' }}>
                      <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginBottom: 3 }}>Descripción</div>
                      <p style={{ ...bodyStyle, color: 'var(--text)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{body.description}</p>
                    </div>
                  </ReviewGroup>
                  <ReviewGroup
                    title="Tokenomics"
                    onEdit={() => go(2)}
                    isMobile={isMobile}
                    rows={[
                      ['Valuación', fmtMoney(body.valuation)],
                      ['Precio por token', fmtMoney(body.tokenPrice, 6)],
                      ['Tokens a emitir', fmtCount(body.totalTokens)],
                      ['Capitalización', fmtMoney(body.tokenPrice * body.totalTokens)],
                      ['Rendimiento anual esperado', fmtPercent(body.expectedApy)],
                    ]}
                  />
                  <ReviewGroup
                    title="Contacto"
                    onEdit={() => go(3)}
                    isMobile={isMobile}
                    rows={[
                      ['Nombre', body.contactName],
                      ['Email', body.contactEmail],
                      ['Teléfono', body.contactPhone ?? '—'],
                    ]}
                  />
                </>
              ) : (
                <Notice tone="warn">Hay datos incompletos. Vuelve a los pasos anteriores para completarlos.</Notice>
              )}
            </PCard>

            <PCard style={{ padding: isMobile ? '16px' : '20px 24px', marginBottom: 24, background: 'var(--accent-bg)', border: '1.5px solid var(--accent)' }}>
              <p style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--sec)', lineHeight: 1.6 }}>
                Al enviar, tu solicitud queda <strong style={{ color: 'var(--text)' }}>Enviada</strong> y el equipo de Brikme la revisa. En el paso siguiente vas a poder subir la documentación del activo. Enviar la solicitud no publica el activo ni emite tokens.
              </p>
            </PCard>

            {submitError && <Notice tone="error" style={{ marginBottom: 16 }}>{submitError}</Notice>}
            <StepNav onBack={() => go(3)} onNext={() => void submit()} nextLabel={sending ? 'Enviando…' : 'Enviar solicitud'} busy={sending} nextDisabled={!body} />
          </motion.div>
        )}

        {/* Step 5: documents (the request already exists) */}
        {step === 5 && created && (
          <motion.div key="s5" {...STEP_MOTION}>
            <DocumentsStep key={created.id} request={created} onFinish={() => go(6)} isMobile={isMobile} />
          </motion.div>
        )}

        {/* Done */}
        {step === 6 && created && (
          <motion.div key="s6" {...STEP_MOTION}>
            <PCard style={{ padding: isMobile ? '24px 18px' : '32px', marginBottom: 16 }}>
              <div aria-hidden="true" style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h2 data-step-title tabIndex={-1} style={{ ...STEP_TITLE, textAlign: 'center' }}>Recibimos tu solicitud</h2>
              <p style={{ ...bodyStyle, textAlign: 'center', maxWidth: 520, margin: '0 auto 20px', overflowWrap: 'anywhere' }}>
                El equipo de Brikme va a revisar <strong style={{ color: 'var(--text)' }}>{created.data.assetName}</strong> junto con la documentación que subiste. Vas a ver cada cambio de estado en Mis solicitudes.
              </p>
              <h3 style={{ ...labelStyle, maxWidth: 520, margin: '0 auto 8px' }}>Qué sigue</h3>
              <ol style={{ ...bodyStyle, maxWidth: 520, margin: '0 auto', paddingLeft: 20, listStyle: 'decimal', display: 'flex', flexDirection: 'column', gap: 6, overflowWrap: 'anywhere' }}>
                <li>El equipo revisa los datos y los documentos; la solicitud pasa a <strong style={{ color: 'var(--text)' }}>En revisión</strong>.</li>
                <li>Si falta algo, te deja una nota en la solicitud o te contacta a {created.data.contactEmail}.</li>
                <li>Si necesita cambios, la vas a ver como <strong style={{ color: 'var(--text)' }}>Requiere cambios</strong> con una nota; puedes sumar documentos desde Mis solicitudes.</li>
                <li>Si se aprueba, el equipo crea el proyecto en borrador, lo publica y emite el token en la red. Vas a seguir cada etapa en Mis solicitudes.</li>
              </ol>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
                <PBtn
                  variant="accent"
                  onClick={() => {
                    reset();
                    onShowRequests();
                  }}
                >
                  Ver mis solicitudes
                </PBtn>
                <PBtn variant="secondary" onClick={reset}>Nueva solicitud</PBtn>
              </div>
            </PCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

/** Same stepper as the demo, as an ordered list; on mobile only the active label is shown. */
function Stepper({ current, isMobile }: { current: number; isMobile: boolean }) {
  const total = LIVE_STEPS.length;
  const size = isMobile ? 32 : 36;
  return (
    <>
      <ol aria-label="Pasos de la solicitud" data-guide="tokenize-steps" style={{ display: 'flex', alignItems: 'center', marginBottom: isMobile ? 12 : 36, gap: 0, listStyle: 'none' }}>
        {LIVE_STEPS.map((label, i) => {
          const done = current > i;
          const active = current === i;
          return (
            <li key={label} aria-current={active ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', flex: i < total - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <motion.div
                  aria-hidden="true"
                  animate={{ background: active ? 'var(--accent)' : done ? 'var(--pos)' : 'var(--surface2)', color: current >= i ? (active ? 'var(--accent-fg)' : '#fff') : 'var(--ter)' }}
                  style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, transition: 'all 0.3s', border: `2px solid ${active ? 'var(--accent)' : done ? 'var(--pos)' : 'var(--border)'}` }}
                >
                  {done ? CHECK : i + 1}
                </motion.div>
                <span
                  className={isMobile ? 'sr-only' : undefined}
                  style={isMobile ? undefined : { fontFamily: 'var(--font-b)', fontSize: 11, color: active ? 'var(--text)' : 'var(--ter)', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}
                >
                  {label}
                  {done && <span className="sr-only"> (completado)</span>}
                </span>
              </div>
              {i < total - 1 && (
                <div aria-hidden="true" style={{ flex: 1, height: 2, background: done ? 'var(--pos)' : 'var(--border-l)', margin: isMobile ? '0 4px' : '0 8px', marginBottom: isMobile ? 0 : 22, transition: 'background 0.3s' }} />
              )}
            </li>
          );
        })}
      </ol>
      <p
        role="status"
        className={isMobile ? undefined : 'sr-only'}
        style={isMobile ? { fontFamily: 'var(--font-b)', fontSize: 12.5, fontWeight: 600, color: 'var(--sec)', marginBottom: 20 } : undefined}
      >
        {current < total ? `Paso ${current + 1} de ${total}: ${LIVE_STEPS[current]}` : 'Solicitud enviada'}
      </p>
    </>
  );
}

/** Asset type cards (same look as the demo) as an accessible radio group. */
function CategoryPicker({ id, labelledBy, value, onChange, error, isMobile }: {
  id: string;
  labelledBy: string;
  value: Category | '';
  onChange: (c: Category) => void;
  error?: string;
  isMobile: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabbable = value ? CATEGORIES.indexOf(value) : 0;
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const j = (i + delta + CATEGORIES.length) % CATEGORIES.length;
    onChange(CATEGORIES[j]);
    refs.current[j]?.focus();
  };
  return (
    <>
      <div
        id={id}
        role="radiogroup"
        tabIndex={-1}
        aria-labelledby={labelledBy}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-msg` : undefined}
        style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14, outline: 'none' }}
      >
        {CATEGORIES.map((c, i) => {
          const meta = CATEGORY_META[c];
          const selected = value === c;
          return (
            <motion.button
              key={c}
              ref={el => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={i === tabbable ? 0 : -1}
              whileHover={{ y: -3 }}
              onClick={() => onChange(c)}
              onKeyDown={e => onKey(e, i)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', font: 'inherit', padding: '20px', cursor: 'pointer',
                background: selected ? 'var(--accent-bg)' : 'var(--surface)', backdropFilter: 'blur(2px) saturate(140%)', WebkitBackdropFilter: 'blur(2px) saturate(140%)',
                borderRadius: 20, boxShadow: 'var(--sh-md)', overflow: 'hidden', border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              <span aria-hidden="true" style={{ display: 'block', fontSize: 28, marginBottom: 10 }}>{meta.icon}</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{meta.label}</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', lineHeight: 1.4 }}>{meta.desc}</span>
            </motion.button>
          );
        })}
      </div>
      {error && <div id={`${id}-msg`} role="alert" style={{ ...ERROR_TEXT, marginTop: 12 }}>{error}</div>}
    </>
  );
}

function StepNav({ onBack, onNext, nextLabel = 'Continuar →', busy = false, nextDisabled = false }: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  /** A request is in flight: both buttons are locked. */
  busy?: boolean;
  nextDisabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <PBtn variant="secondary" onClick={onBack} disabled={busy}>← Atrás</PBtn>
      <PBtn variant="accent" onClick={onNext} disabled={busy || nextDisabled}>{nextLabel}</PBtn>
    </div>
  );
}

/** Issue capitalisation (price × tokens) compared with the declared valuation. Informative only. */
function Capitalization({ valuation, tokenPrice, totalTokens, isMobile }: { valuation: number | null; tokenPrice: number | null; totalTokens: number | null; isMobile: boolean }) {
  if (!tokenPrice || !totalTokens || tokenPrice <= 0 || totalTokens <= 0) return null;
  const cap = Math.round(tokenPrice * totalTokens * 100) / 100;
  const ratio = valuation && valuation > 0 ? cap / valuation : null;
  const note: { warn: boolean; text: string } | null =
    ratio === null
      ? null
      : Math.abs(ratio - 1) < 0.005
        ? { warn: false, text: 'La capitalización coincide con la valuación declarada.' }
        : ratio < 1
          ? { warn: false, text: `La emisión representa el ${fmtPercent(ratio * 100)} de la valuación del activo.` }
          : { warn: true, text: `La capitalización supera la valuación en un ${fmtPercent((ratio - 1) * 100)}. Revisa el precio por token o la cantidad.` };
  const metric = (label: string, value: string) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--font-b)', fontSize: 11, color: 'var(--ter)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--accent-text)', overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  );
  return (
    <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--accent-bg)', borderRadius: 12 }}>
      <div style={{ display: 'flex', gap: isMobile ? 16 : 24, flexWrap: 'wrap' }}>
        {metric('Capitalización (precio × tokens)', fmtMoney(cap))}
        {valuation !== null && valuation > 0 && metric('Valuación declarada', fmtMoney(valuation))}
        {metric('Tokens a emitir', fmtCount(totalTokens))}
      </div>
      {note && <p style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, lineHeight: 1.5, color: note.warn ? '#B7791F' : 'var(--sec)', marginTop: 10 }}>{note.text}</p>}
    </div>
  );
}

function ReviewGroup({ title, onEdit, rows, isMobile, children }: { title: string; onEdit: () => void; rows: Array<[string, string]>; isMobile: boolean; children?: ReactNode }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3 style={labelStyle}>{title}</h3>
        <button type="button" onClick={onEdit} style={LINK_BTN}>
          Editar<span className="sr-only"> {title.toLowerCase()}</span>
        </button>
      </div>
      <dl style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', columnGap: 16 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-l)', minWidth: 0 }}>
            <dt style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginBottom: 3 }}>{k}</dt>
            <dd style={{ fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', fontWeight: 500, overflowWrap: 'anywhere' }}>{v}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}
