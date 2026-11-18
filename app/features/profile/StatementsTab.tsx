import type { CSSProperties, ReactNode } from 'react';
import { PBtn, PCard, PChip } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { explorerUrl } from '~/lib/onchain';
import { useSession } from '~/lib/session';
import { fmtDate } from './api';
import { useStatement } from './hooks';
import { EmptyState, Notice, Section, Skeleton } from './kit';
import { printStatement, saveStatementCsv } from './statements';
import { labelStyle, tdStyle, thStyle } from './styles';

// Impuestos (live): yearly statement from GET /v1/me/statements?year=, with CSV export
// (built client-side) and a printable version.

const usd2 = (n: number): string => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty: boolean }) {
  if (empty) return <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', padding: '6px 0' }}>Sin movimientos en el año.</div>;
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
  const isMobile = useMobile();
  const { user } = useSession();
  const { data: s, loading, error } = useStatement(year);
  const ready = s && s.year === year ? s : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div role="group" aria-label="Año fiscal" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={labelStyle}>Año fiscal</span>
          {years.map(y => <PChip key={y} label={String(y)} active={y === year} onClick={() => onYear(y)} />)}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <PBtn variant="secondary" small disabled={!ready} onClick={() => ready && saveStatementCsv(ready)}>Descargar CSV</PBtn>
          <PBtn variant="secondary" small disabled={!ready} onClick={() => ready && user && printStatement(ready, { name: user.displayName || user.walletAddress, wallet: user.walletAddress })}>Imprimir</PBtn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
        {([
          ['Total invertido', ready ? usd2(ready.totals.invested) : '—'],
          ['Dividendos asignados', ready ? usd2(ready.totals.dividends) : '—'],
          ['Inversiones confirmadas', ready ? String(ready.investments.length) : '—'],
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
        <Notice tone="error">No pudimos cargar el resumen de {year}. Probá de nuevo más tarde.</Notice>
      ) : ready && !ready.investments.length && !ready.dividends.length ? (
        <PCard style={{ padding: '10px 24px' }}>
          <EmptyState title={`No hay movimientos en ${year}`} text="Cuando inviertas o recibas dividendos en el año, los vas a ver acá con su detalle." />
        </PCard>
      ) : ready ? (
        <>
          <Section title="Inversiones">
            <Table head={['Fecha', 'Activo', 'Tokens', 'Monto', 'Transacción']} empty={!ready.investments.length}>
              {ready.investments.map((i, k) => {
                const href = i.txHash ? explorerUrl('tx', i.txHash) : null;
                const short = i.txHash ? `${i.txHash.slice(0, 8)}…${i.txHash.slice(-6)}` : '—';
                return (
                  <tr key={`${i.date}-${k}`}>
                    <td style={tdStyle}>{fmtDate(i.date)}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 140 }}>{i.assetName}</td>
                    <td style={{ ...tdStyle, ...num }}>{i.tokens.toLocaleString('es-AR')}</td>
                    <td style={{ ...tdStyle, ...num, fontWeight: 600 }}>{usd2(i.amount)}</td>
                    <td style={{ ...tdStyle, paddingRight: 0 }}>
                      {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#8247E5', textDecoration: 'none', fontWeight: 600 }}>{short} ↗</a> : <span style={{ color: 'var(--ter)' }} title={i.txHash ?? undefined}>{short}</span>}
                    </td>
                  </tr>
                );
              })}
            </Table>
          </Section>
          <Section title="Dividendos">
            <Table head={['Fecha', 'Activo', 'Monto']} empty={!ready.dividends.length}>
              {ready.dividends.map((d, k) => (
                <tr key={`${d.date}-${k}`}>
                  <td style={tdStyle}>{fmtDate(d.date)}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 140 }}>{d.assetName}</td>
                  <td style={{ ...tdStyle, ...num, fontWeight: 600, color: 'var(--pos)', paddingRight: 0 }}>+{usd2(d.amount)}</td>
                </tr>
              ))}
            </Table>
          </Section>
        </>
      ) : null}

      <div style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--ter)', lineHeight: 1.65, padding: '0 4px' }}>
        El resumen incluye las inversiones confirmadas on-chain y los dividendos asignados en el año calendario (UTC). Es informativo: consultá a un asesor fiscal para tu situación particular.
      </div>
    </div>
  );
}
