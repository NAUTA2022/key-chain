import type { CSSProperties, ReactNode } from 'react';
import { PBtn, PCard, PChip } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { useT } from '~/i18n/useT';
import { explorerUrl } from '~/lib/onchain';
import { useSession } from '~/lib/session';
import { fmtDate, intlLocale } from './api';
import { useStatement } from './hooks';
import { EmptyState, Notice, Section, Skeleton } from './kit';
import { printStatement, saveStatementCsv } from './statements';
import { labelStyle, tdStyle, thStyle } from './styles';

// Impuestos (live): yearly statement from GET /v1/me/statements?year=, with CSV export
// (built client-side) and a printable version.

const usd2 = (n: number, locale: string): string => '$' + n.toLocaleString(intlLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty: boolean }) {
  const { t } = useT('profile');
  if (empty) return <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', padding: '6px 0' }}>{t('statements.noMovements')}</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{head.map(h => <th key={h} scope="col" style={thStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const num: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export default function StatementsTab({ year, years, onYear }: { year: number; years: number[]; onYear: (y: number) => void }) {
  const { t, locale } = useT('profile');
  const isMobile = useMobile();
  const { user } = useSession();
  const col = (k: string) => t(`statements.cols.${k}`);
  const { data: s, loading, error } = useStatement(year);
  const ready = s && s.year === year ? s : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div role="group" aria-label={t('statements.fiscalYear')} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={labelStyle}>{t('statements.fiscalYear')}</span>
          {years.map(y => <PChip key={y} label={String(y)} active={y === year} onClick={() => onYear(y)} />)}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <PBtn variant="secondary" small disabled={!ready} onClick={() => ready && saveStatementCsv(ready, t)}>{t('statements.downloadCsv')}</PBtn>
          <PBtn variant="secondary" small disabled={!ready} onClick={() => ready && user && printStatement(ready, { name: user.displayName || user.walletAddress, wallet: user.walletAddress }, t, locale)}>{t('statements.print.button')}</PBtn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
        {([
          [t('statements.totalInvested'), ready ? usd2(ready.totals.invested, locale) : '—'],
          [t('statements.dividendsAssigned'), ready ? usd2(ready.totals.dividends, locale) : '—'],
          [t('statements.confirmedInvestments'), ready ? String(ready.investments.length) : '—'],
        ] as const).map(([label, value]) => (
          <PCard key={label} style={{ padding: '20px 22px' }}>
            <div style={{ ...labelStyle, letterSpacing: '0.07em', marginBottom: 6 }}>{label} · {year}</div>
            <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em', ...num }}>{value}</div>
          </PCard>
        ))}
      </div>

      {loading && !ready ? (
        <PCard style={{ padding: '22px 24px' }}><Skeleton rows={4} /></PCard>
      ) : error && !ready ? (
        <Notice tone="error">{t('statements.loadError', { year })}</Notice>
      ) : ready && !ready.investments.length && !ready.dividends.length ? (
        <PCard style={{ padding: '10px 24px' }}>
          <EmptyState title={t('statements.emptyTitle', { year })} text={t('statements.emptyText')} />
        </PCard>
      ) : ready ? (
        <>
          <Section title={t('statements.investments')}>
            <Table head={[col('date'), col('asset'), col('tokens'), col('amount'), col('tx')]} empty={!ready.investments.length}>
              {ready.investments.map((i, k) => {
                const href = i.txHash ? explorerUrl('tx', i.txHash) : null;
                const short = i.txHash ? `${i.txHash.slice(0, 8)}…${i.txHash.slice(-6)}` : '—';
                return (
                  <tr key={`${i.date}-${k}`}>
                    <td style={tdStyle}>{fmtDate(i.date, undefined, locale)}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 140 }}>{i.assetName}</td>
                    <td style={{ ...tdStyle, ...num }}>{i.tokens.toLocaleString(intlLocale(locale))}</td>
                    <td style={{ ...tdStyle, ...num, fontWeight: 600 }}>{usd2(i.amount, locale)}</td>
                    <td style={{ ...tdStyle, paddingRight: 0 }}>
                      {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#8247E5', textDecoration: 'none', fontWeight: 600 }}>{short} ↗</a> : <span style={{ color: 'var(--ter)' }} title={i.txHash ?? undefined}>{short}</span>}
                    </td>
                  </tr>
                );
              })}
            </Table>
          </Section>
          <Section title={t('statements.dividends')}>
            <Table head={[col('date'), col('asset'), col('amount')]} empty={!ready.dividends.length}>
              {ready.dividends.map((d, k) => (
                <tr key={`${d.date}-${k}`}>
                  <td style={tdStyle}>{fmtDate(d.date, undefined, locale)}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 140 }}>{d.assetName}</td>
                  <td style={{ ...tdStyle, ...num, fontWeight: 600, color: 'var(--pos)', paddingRight: 0 }}>+{usd2(d.amount, locale)}</td>
                </tr>
              ))}
            </Table>
          </Section>
        </>
      ) : null}

      <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', lineHeight: 1.65, padding: '0 4px' }}>
        {t('statements.disclaimer')}
      </div>
    </div>
  );
}
