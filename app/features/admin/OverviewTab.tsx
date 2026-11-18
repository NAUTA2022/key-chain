import { PArea, PCard } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { fmtCompact, fmtInt, fmtMoney, monthLabel } from './format';
import { errText, sub } from './styles';
import type { AdminStats } from './types';
import { Kpi } from './ui';

type Go = (tab: 'kyc' | 'soporte' | 'solicitudes' | 'blockchain' | 'usuarios') => void;

/** "Resumen": platform KPIs and the monthly series from GET /v1/admin/stats. */
export function OverviewTab({ stats, error, onGo }: { stats: AdminStats | null; error: string | null; onGo: Go }) {
  const mobile = useMobile();
  if (!stats) {
    return (
      <PCard style={{ padding: '20px 24px' }}>
        {error ? <span role="alert" style={errText}>{error}</span> : <span style={sub}>Cargando métricas…</span>}
      </PCard>
    );
  }
  const s = stats;
  const kpis: Array<{ label: string; value: string; note: string; go?: Parameters<Go>[0] }> = [
    {
      label: 'TVL',
      value: s.tvlSource === 'chain' ? fmtCompact(s.tvlUsdc) : '—',
      note: s.tvlSource === 'chain' ? 'USDC en vaults activos (on-chain)' : 'Lectura on-chain no disponible',
      go: 'blockchain',
    },
    { label: 'Inversores', value: fmtInt(s.investments.investors), note: `${fmtInt(s.users.total)} usuarios · +${fmtInt(s.users.new7d)} en 7 días`, go: 'usuarios' },
    { label: 'Invertido', value: fmtCompact(s.investments.investedTotal), note: `${fmtInt(s.investments.ordersMinted)} órdenes acreditadas` },
    { label: 'Fee revenue', value: fmtCompact(s.fees.total), note: `Emisión ${fmtCompact(s.fees.issuance)} · Dividendos ${fmtCompact(s.fees.dividends)}` },
    { label: 'KYC pendientes', value: fmtInt(s.kyc.pending), note: `${fmtInt(s.kyc.verified)} aprobados · ${fmtInt(s.kyc.rejected)} rechazados`, go: 'kyc' },
    { label: 'Tickets abiertos', value: fmtInt(s.support.open), note: `${fmtInt(s.support.answered)} respondidos esperando al usuario`, go: 'soporte' },
    { label: 'Solicitudes pendientes', value: fmtInt(s.tokenizationRequests.pending), note: 'Tokenizaciones por revisar', go: 'solicitudes' },
    {
      label: 'Pools activos',
      value: fmtInt(s.pools.active),
      note: `${fmtInt(s.pools.liquidated)} liquidados · ${fmtInt(s.pools.deploying)} desplegando${s.pools.failed ? ` · ${fmtInt(s.pools.failed)} con error` : ''}`,
      go: 'blockchain',
    },
  ];
  const months = s.monthly.map(m => m.month);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: mobile ? 10 : 14, marginBottom: 24 }}>
        {kpis.map((k, i) => <Kpi key={k.label} index={i} label={k.label} value={k.value} note={k.note} onClick={k.go ? () => k.go && onGo(k.go) : undefined} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <MonthlyChart id="adminInvested" title="Invertido por mes" months={months} values={s.monthly.map(m => m.invested)} />
        <MonthlyChart id="adminFees" title="Revenue mensual de fees" months={months} values={s.monthly.map(m => m.fees)} />
      </div>
    </>
  );
}

function MonthlyChart({ id, title, months, values }: { id: string; title: string; months: string[]; values: number[] }) {
  const total = values.reduce((a, b) => a + b, 0);
  const empty = values.every(v => v === 0);
  return (
    <PCard style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{title}</div>
        <div style={sub}>Últimos 12 meses: <strong style={{ color: 'var(--text)' }}>{fmtMoney(total)}</strong></div>
      </div>
      {values.length > 1 && <div aria-hidden="true"><PArea data={values} height={120} id={id} /></div>}
      <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {months.map(m => <span key={m} style={{ ...sub, fontSize: 10 }}>{monthLabel(m)}</span>)}
      </div>
      {empty && <div style={{ ...sub, marginTop: 8 }}>Sin movimientos en el período.</div>}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {months.map((m, i) => (
            <tr key={m}><th scope="row">{m}</th><td>{fmtMoney(values[i] ?? 0)}</td></tr>
          ))}
        </tbody>
      </table>
    </PCard>
  );
}
