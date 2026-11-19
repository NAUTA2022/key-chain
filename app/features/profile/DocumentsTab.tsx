import { useState } from 'react';
import { Icons, PBtn, PTag } from '~/components/ui';
import { kycStatusTag } from '~/features/kyc/status';
import { useMobile } from '~/hooks/useMobile';
import { useT } from '~/i18n/useT';
import { useKyc } from '~/lib/onchain';
import { countryLabel, fmtDate } from './api';
import { Notice, Section, Skeleton } from './kit';
import { downloadStatementCsv } from './statements';
import { mutedStyle } from './styles';

// Documentos (live): what the platform holds about the identity check, plus the yearly
// statements ready to download. Identity documents themselves are never re-served here.

const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-l)', paddingBottom: 10 } as const;

export default function DocumentsTab({ years, onOpenYear }: { years: number[]; onOpenYear: (y: number) => void }) {
  const { t, locale } = useT('profile');
  const isMobile = useMobile();
  const { data: kyc, loading } = useKyc();
  const [busyYear, setBusyYear] = useState<number | null>(null);
  const [failed, setFailed] = useState<number | null>(null);
  const tag = kycStatusTag(kyc?.status);
  const identity = kyc?.onchain?.identityAddress;

  async function download(y: number) {
    setBusyYear(y);
    setFailed(null);
    const ok = await downloadStatementCsv(y, t);
    setBusyYear(null);
    if (!ok) setFailed(y);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
      <Section title={t('documents.identityTitle')} action={<PTag label={loading && !kyc ? '…' : t(tag.labelKey)} color={tag.color} />}>
        {loading && !kyc ? (
          <Skeleton rows={4} />
        ) : !kyc || kyc.status === 'none' ? (
          <div style={mutedStyle}>{t('documents.notSubmitted')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {([
              [t('kyc.fields.type'), kyc.type === 'business' ? t('kyc.fields.business') : t('kyc.fields.individual')],
              [kyc.type === 'business' ? t('kyc.fields.legalName') : t('kyc.fields.fullName'), kyc.legalName ?? '—'],
              [t('kyc.fields.country'), countryLabel(kyc.country, locale)],
              [t('kyc.fields.submitted'), fmtDate(kyc.submittedAt, undefined, locale)],
              [t('kyc.fields.onchainIdentity'), identity ? `${identity.slice(0, 6)}…${identity.slice(-4)}` : '—'],
            ] as const).map(([k, v]) => (
              <div key={k} style={row}>
                <div style={mutedStyle}>{k}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 13.5, color: 'var(--text)', fontWeight: 600, textAlign: 'right', overflowWrap: 'anywhere' }}>{v}</div>
              </div>
            ))}
            {kyc.status === 'rejected' && kyc.rejectionReason && <Notice tone="error">{t('documents.rejectionReason', { reason: kyc.rejectionReason })}</Notice>}
            <div style={{ ...mutedStyle, fontSize: 12 }}>{t('documents.noRedownload')}</div>
          </div>
        )}
      </Section>

      <Section title={t('documents.statementsTitle')}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {years.map(y => (
            <li key={y} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--border-l)', background: 'var(--surface2)', flexWrap: 'wrap' }}>
              <div aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', flexShrink: 0 }}>{Icons.doc}</div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontFamily: 'var(--font-b)', fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{t('documents.statementYear', { year: y })}</div>
                <div style={{ fontFamily: 'var(--font-b)', fontSize: 12, color: 'var(--ter)', marginTop: 2 }}>{t('documents.statementDesc')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <PBtn variant="ghost" small onClick={() => onOpenYear(y)}>{t('documents.view')}</PBtn>
                <PBtn variant="secondary" small disabled={busyYear !== null} onClick={() => void download(y)}>{busyYear === y ? t('documents.downloading') : t('documents.csv')}</PBtn>
              </div>
            </li>
          ))}
        </ul>
        {failed !== null && <Notice tone="error" style={{ marginTop: 12 }}>{t('documents.downloadError', { year: failed })}</Notice>}
      </Section>
    </div>
  );
}
