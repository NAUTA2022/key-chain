import { useState, type CSSProperties } from 'react';
import { PBtn, PCard, PInput, PTag } from '~/components/ui';
import { kycStatusTag } from './status';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { COUNTRY_OPTIONS, countryName, type CountryCode } from '~/lib/countries';
import { useKyc, type KycStatus } from '~/lib/onchain';
import { errorText } from '~/features/profile/api';
import { useSession } from '~/lib/session';

// Live KYC tab (backend enabled): same two cards as the demo, fed by /v1/kyc.

const ONCHAIN_LABEL: Record<NonNullable<KycStatus['onchain']>['status'], string> = {
  queued: 'Identidad on-chain en cola',
  deploying: 'Creando identidad on-chain…',
  claiming: 'Registrando credenciales KYC…',
  registering: 'Registrando wallet en el registro de identidad…',
  verified: 'Wallet verificada on-chain (ERC-3643)',
  failed: 'El registro on-chain falló; el equipo lo reintentará',
};

const STEPS = ['Datos de identidad enviados', 'Revisión de cumplimiento', 'Identidad on-chain (ONCHAINID)', 'Credenciales KYC y jurisdicción', 'Wallet habilitada para invertir'];

const label: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)' };
const value: CSSProperties = { fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', fontWeight: 600 };
const selectStyle: CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, padding: '12px 16px', border: '1.5px solid var(--border)', width: '100%',
  boxSizing: 'border-box', fontFamily: 'var(--font-b)', fontSize: 14, color: 'var(--text)', outline: 'none',
};

function stepsDone(k: KycStatus | null): number {
  if (!k || k.status === 'none' || k.status === 'rejected') return 0;
  if (k.status === 'pending') return 1;
  const o = k.onchain?.status;
  return o === 'verified' ? 5 : o === 'registering' ? 4 : o === 'claiming' ? 3 : 2;
}

type KycLiveProps = {
  /** Prefills the form, e.g. a company account's KYB (type business + its registered data). */
  initial?: { type: 'individual' | 'business'; legalName?: string; documentId?: string; country?: string | null };
  /** Called after a successful submission. */
  onSubmitted?: () => void;
};

const supportedCountry = (code: string | null | undefined): CountryCode | undefined => COUNTRY_OPTIONS.find(([c]) => c === code)?.[0];

export default function KycLive({ initial, onSubmitted }: KycLiveProps = {}) {
  const isMobile = useMobile();
  const { refresh, user } = useSession();
  const { data: kyc, loading, reload } = useKyc();
  const [form, setForm] = useState<{ type: 'individual' | 'business'; legalName: string; documentId: string; country: CountryCode }>(() => ({
    type: initial?.type ?? 'individual',
    legalName: initial?.legalName ?? '',
    documentId: initial?.documentId ?? '',
    country: supportedCountry(initial?.country) ?? supportedCountry(user?.country) ?? 'CO',
  }));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tag = kycStatusTag(kyc?.status);
  const done = stepsDone(kyc);
  const canSubmit = !kyc || kyc.status === 'none' || kyc.status === 'rejected';

  async function submit() {
    setSending(true);
    setError(null);
    const { data, error: e }: { data?: KycStatus; error?: unknown } = await api.PUT('/v1/kyc', { body: form });
    setSending(false);
    if (!data) return setError(errorText(e, 'No se pudo enviar la verificación. Revisa los datos.', { conflict: 'Tu verificación ya fue enviada o aprobada. Recarga la página.' }));
    reload();
    await refresh();
    onSubmitted?.();
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
      <PCard guide="profile-kyc" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Estado KYC</div>
          <PTag label={loading ? '…' : tag.label} color={tag.color} />
        </div>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {STEPS.map((c, i) => {
            const ok = i < done;
            return (
              <li key={c} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < STEPS.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: ok ? '#22c55e20' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {ok && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l5 5L20 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: ok ? 'var(--text)' : 'var(--ter)' }}>{c}</span>
              </li>
            );
          })}
        </ol>
        <div role="status" style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: kyc?.onchain?.status === 'failed' ? 'var(--neg)' : 'var(--ter)', marginTop: 14 }}>
          {kyc?.status === 'rejected' && kyc.rejectionReason ? `Rechazado: ${kyc.rejectionReason}` : kyc?.onchain ? ONCHAIN_LABEL[kyc.onchain.status] : kyc?.status === 'pending' ? 'Tu verificación está en revisión.' : 'Completa tus datos para habilitar la inversión on-chain.'}
        </div>
      </PCard>

      <PCard style={{ padding: '22px 24px' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>{canSubmit ? 'Verifica tu identidad' : 'Información personal'}</div>
        {canSubmit ? (
          <form onSubmit={e => { e.preventDefault(); void submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <select aria-label="Tipo de verificación" value={form.type} onChange={e => setForm({ ...form, type: e.target.value === 'business' ? 'business' : 'individual' })} style={selectStyle}>
              <option value="individual">Persona (KYC)</option>
              <option value="business">Empresa (KYB)</option>
            </select>
            <PInput name="legalName" autoComplete="name" maxLength={160} placeholder={form.type === 'business' ? 'Razón social' : 'Nombre completo'} value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} />
            <PInput name="documentId" maxLength={40} placeholder={form.type === 'business' ? 'CUIT / NIT / Tax ID' : 'Número de documento'} value={form.documentId} onChange={e => setForm({ ...form, documentId: e.target.value })} />
            <select aria-label="País de residencia" value={form.country} onChange={e => setForm({ ...form, country: e.target.value as CountryCode })} style={selectStyle}>
              {COUNTRY_OPTIONS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
            {error && <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--neg)' }}>{error}</div>}
            <PBtn variant="accent" disabled={sending || form.legalName.trim().length < 3 || form.documentId.trim().length < 4} style={{ width: '100%', padding: '12px' }}>
              {sending ? 'Enviando…' : 'Enviar verificación'}
            </PBtn>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              [kyc?.type === 'business' ? 'Razón social' : 'Nombre completo', kyc?.legalName ?? '—'],
              ['Tipo', kyc?.type === 'business' ? 'Empresa (KYB)' : 'Persona (KYC)'],
              ['País de residencia', countryName(kyc?.country)],
              ['Enviado', kyc?.submittedAt ? new Date(kyc.submittedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
              ['Identidad on-chain', kyc?.onchain?.identityAddress ? `${kyc.onchain.identityAddress.slice(0, 6)}…${kyc.onchain.identityAddress.slice(-4)}` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-l)', paddingBottom: 10 }}>
                <div style={label}>{k}</div>
                <div style={{ ...value, textAlign: 'right', overflowWrap: 'anywhere' }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </PCard>
    </div>
  );
}
