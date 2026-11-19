import { useState, type CSSProperties } from 'react';
import { PBtn, PCard, PInput, PTag } from '~/components/ui';
import { kycStatusTag } from './status';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { COUNTRY_OPTIONS, type CountryCode } from '~/lib/countries';
import { useKyc, type KycStatus } from '~/lib/onchain';
import { countryLabel, countryOptions, errorText, fmtDate } from '~/features/profile/api';
import { useT } from '~/i18n/useT';
import { useSession } from '~/lib/session';

// Live KYC tab (backend enabled): same two cards as the demo, fed by /v1/kyc.

// On-chain step texts live in `kyc.onchain.<status>`, the checklist in `kyc.steps` (profile namespace).

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
  const { t, raw, locale } = useT('profile');
  const steps = raw<string[]>('kyc.steps');
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
    if (!data) return setError(errorText(e, t('kyc.errors.submit'), { conflict: t('kyc.errors.conflict') }, t));
    reload();
    await refresh();
    onSubmitted?.();
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
      <PCard guide="profile-kyc" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{t('kyc.title')}</div>
          <PTag label={loading ? '…' : t(tag.labelKey)} color={tag.color} />
        </div>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {steps.map((c, i) => {
            const ok = i < done;
            return (
              <li key={c} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < steps.length - 1 ? '1px solid var(--border-l)' : 'none' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: ok ? '#22c55e20' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {ok && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l5 5L20 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: ok ? 'var(--text)' : 'var(--ter)' }}>{c}</span>
              </li>
            );
          })}
        </ol>
        <div role="status" style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: kyc?.onchain?.status === 'failed' ? 'var(--neg)' : 'var(--ter)', marginTop: 14 }}>
          {kyc?.status === 'rejected' && kyc.rejectionReason ? t('kyc.rejectedReason', { reason: kyc.rejectionReason }) : kyc?.onchain ? t(`kyc.onchain.${kyc.onchain.status}`) : kyc?.status === 'pending' ? t('kyc.inReview') : t('kyc.complete')}
        </div>
      </PCard>

      <PCard style={{ padding: '22px 24px' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 18 }}>{canSubmit ? t('kyc.verifyTitle') : t('kyc.personalInfo')}</div>
        {canSubmit ? (
          <form onSubmit={e => { e.preventDefault(); void submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <select aria-label={t('kyc.typeAria')} value={form.type} onChange={e => setForm({ ...form, type: e.target.value === 'business' ? 'business' : 'individual' })} style={selectStyle}>
              <option value="individual">{t('kyc.fields.individual')}</option>
              <option value="business">{t('kyc.fields.business')}</option>
            </select>
            <PInput name="legalName" autoComplete="name" maxLength={160} placeholder={form.type === 'business' ? t('kyc.fields.legalName') : t('kyc.fields.fullName')} value={form.legalName} onChange={e => setForm({ ...form, legalName: e.target.value })} />
            <PInput name="documentId" maxLength={40} placeholder={form.type === 'business' ? t('kyc.fields.taxId') : t('kyc.fields.documentId')} value={form.documentId} onChange={e => setForm({ ...form, documentId: e.target.value })} />
            <select aria-label={t('kyc.fields.country')} value={form.country} onChange={e => setForm({ ...form, country: e.target.value as CountryCode })} style={selectStyle}>
              {countryOptions(locale).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
            {error && <div role="alert" style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--neg)' }}>{error}</div>}
            <PBtn variant="accent" disabled={sending || form.legalName.trim().length < 3 || form.documentId.trim().length < 4} style={{ width: '100%', padding: '12px' }}>
              {sending ? t('kyc.sending') : t('kyc.submit')}
            </PBtn>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              [kyc?.type === 'business' ? t('kyc.fields.legalName') : t('kyc.fields.fullName'), kyc?.legalName ?? '—'],
              [t('kyc.fields.type'), kyc?.type === 'business' ? t('kyc.fields.business') : t('kyc.fields.individual')],
              [t('kyc.fields.country'), countryLabel(kyc?.country, locale)],
              [t('kyc.fields.submitted'), fmtDate(kyc?.submittedAt, undefined, locale)],
              [t('kyc.fields.onchainIdentity'), kyc?.onchain?.identityAddress ? `${kyc.onchain.identityAddress.slice(0, 6)}…${kyc.onchain.identityAddress.slice(-4)}` : '—'],
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
