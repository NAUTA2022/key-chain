import { PTag } from '~/components/ui';
import { useMobile } from '~/hooks/useMobile';
import { api } from '~/lib/api/client';
import { fetchChainStatus, unwrap, useApiData, usePolling, type ChainStatus } from './api';
import { fmtDateTime, fmtInt, shortHex } from './format';
import { POOL_STATUS, TX_STATUS, txKindLabel } from './labels';
import { errText, strong, sub, td, tdDim } from './styles';
import { Btn, DataTable, Hash, KV, Notice, Panel, Row, Tag } from './ui';
import type { AdminPool } from './useAdminData';

const yes = (v: boolean, ok = 'Sí', no = 'No') => <PTag label={v ? `${ok} ✓` : no} color={v ? 'green' : 'red'} />;

function duration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86_400) return `${Math.round((seconds / 3600) * 10) / 10} h`;
  return `${Math.round((seconds / 86_400) * 10) / 10} días`;
}

const CONTRACT_LABEL: Record<string, string> = {
  factory: 'Factory', identityRegistry: 'Identity registry', timelock: 'Timelock', feeManager: 'Fee manager', membership: 'Membership', usdc: 'USDC',
};

/** "Blockchain": network/signer readiness, the transactions the backend sent and the asset pools. */
export function ChainTab({ pools, poolsLoaded, poolsError }: { pools: AdminPool[]; poolsLoaded: boolean; poolsError: string | null }) {
  const status = useApiData('chain-status', fetchChainStatus);
  const txs = useApiData('chain-txs', () => unwrap(api.GET('/v1/admin/chain/transactions'), 'No se pudieron cargar las transacciones.'));
  const rows = txs.data ?? [];
  usePolling(txs.reload, 5000, rows.some(t => t.status === 'submitted'));
  const chainId = status.data?.chainId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Panel title="Red y firmante" action={<Btn small variant="ghost" disabled={status.loading} onClick={status.reload}>{status.loading ? 'Actualizando…' : 'Actualizar'}</Btn>}>
        {status.error && <Notice tone="error">{status.error}</Notice>}
        {!status.data && !status.error && <span style={sub}>Consultando la red…</span>}
        {status.data && <ChainStatusView s={status.data} />}
      </Panel>

      <section aria-label="Transacciones on-chain">
        <h3 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)', margin: '0 0 12px' }}>Transacciones enviadas por la plataforma</h3>
        <DataTable
          head={['Tipo', 'Estado', 'Hash', 'Referencia', 'Desde → Hacia', 'Bloque', 'Fecha']}
          minWidth={1000}
          loading={txs.loading} error={txs.error} empty={rows.length === 0} emptyText="Todavía no hay transacciones."
        >
          {rows.map((t, i) => (
            <Row key={t.id} last={i === rows.length - 1}>
              <td style={td}><span style={strong}>{txKindLabel(t.kind)}</span></td>
              <td style={td}>
                <Tag spec={TX_STATUS[t.status]} />
                {t.error && <div style={{ ...errText, marginTop: 4, maxWidth: 220 }} title={t.error}>{t.error.length > 90 ? `${t.error.slice(0, 90)}…` : t.error}</div>}
              </td>
              <td style={td}><Hash value={t.hash} kind="tx" chainId={chainId} /></td>
              <td style={td}>{t.refType ? <>{t.refType}<div style={{ ...sub, marginTop: 2 }} title={t.refId ?? undefined}>{shortHex(t.refId, 8, 4)}</div></> : <span style={sub}>—</span>}</td>
              <td style={{ ...td, fontSize: 12 }}><span title={t.fromAddress}>{shortHex(t.fromAddress)}</span> → <span title={t.toAddress ?? undefined}>{shortHex(t.toAddress)}</span></td>
              <td style={tdDim}>{t.blockNumber ?? '—'}</td>
              <td style={tdDim}>{fmtDateTime(t.createdAt)}</td>
            </Row>
          ))}
        </DataTable>
      </section>

      <section aria-label="Pools on-chain">
        <h3 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 15, color: 'var(--text)', margin: '0 0 12px' }}>Pools de activos</h3>
        <DataTable
          head={['Activo', 'Estado', 'Token', 'Vault', 'Red', 'Creado']}
          minWidth={860}
          loading={!poolsLoaded} error={poolsError} empty={pools.length === 0} emptyText="Ningún activo tokenizado todavía."
        >
          {pools.map((p, i) => (
            <Row key={p.id} last={i === pools.length - 1}>
              <td style={td}><span style={strong}>{p.assetName}</span><div style={{ ...sub, marginTop: 2 }}>#{p.assetId}</div></td>
              <td style={td}>
                <Tag spec={POOL_STATUS[p.status]} />
                {p.error && <div style={{ ...errText, marginTop: 4, maxWidth: 220 }} title={p.error}>{p.error.length > 90 ? `${p.error.slice(0, 90)}…` : p.error}</div>}
              </td>
              <td style={td}><Hash value={p.token} kind="address" chainId={p.chainId} /></td>
              <td style={td}><Hash value={p.vault} kind="address" chainId={p.chainId} /></td>
              <td style={tdDim}>{p.chainId}</td>
              <td style={tdDim}>{fmtDateTime(p.createdAt)}</td>
            </Row>
          ))}
        </DataTable>
      </section>
    </div>
  );
}

function ChainStatusView({ s }: { s: ChainStatus }) {
  const mobile = useMobile();
  const ready = s.signer.configured && s.signer.isEngine && s.signer.isTimelockProposer;
  const problems = [
    !s.signer.configured && 'No hay firmante configurado en la API (CHAIN_SIGNER_PRIVATE_KEY).',
    s.signer.configured && !s.signer.isEngine && 'El firmante de la API no es el engine de la plataforma.',
    s.signer.configured && !s.signer.isTimelockProposer && 'El firmante no es proposer del Timelock.',
    !s.engine.isOperator && 'El engine no tiene rol de operador.',
    !s.engine.isIdentityAgent && 'El engine no es agente del Identity Registry (no puede verificar KYC).',
    !s.claimSigner.authorized && 'El firmante de claims KYC no está autorizado.',
  ].filter((p): p is string => typeof p === 'string');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <PTag label={ready ? 'Listo para operar ✓' : 'No puede operar'} color={ready ? 'green' : 'red'} />
        <span style={sub}>{s.network} · chain {s.chainId} · bloque {fmtInt(s.blockNumber)}</span>
        <PTag label={s.faucetEnabled ? 'Faucet activo' : 'Faucet desactivado'} color={s.faucetEnabled ? 'blue' : 'neutral'} />
      </div>
      {problems.length > 0 && (
        <Notice tone="error">
          <ul style={{ margin: 0, paddingLeft: 18 }}>{problems.map(p => <li key={p}>{p}</li>)}</ul>
        </Notice>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
        <KV rows={[
          ['Firmante API', <Hash key="s" value={s.signer.address} kind="address" chainId={s.chainId} />],
          ['Es el engine', yes(s.signer.isEngine)],
          ['Proposer del Timelock', yes(s.signer.isTimelockProposer)],
          ['Firmante de claims', <Hash key="c" value={s.claimSigner.address} kind="address" chainId={s.chainId} />],
          ['Claims autorizados', yes(s.claimSigner.authorized)],
          ['Demora del Timelock', duration(s.timelockMinDelaySeconds)],
        ]} />
        <KV rows={[
          ['Engine', <Hash key="e" value={s.engine.address} kind="address" chainId={s.chainId} />],
          ['Operador', yes(s.engine.isOperator)],
          ['Agente de identidad', yes(s.engine.isIdentityAgent)],
          ['Membresía', s.engine.membershipTier],
          ['Pools desplegados', fmtInt(s.engine.poolsDeployed)],
          ['Balance de gas', `${Number(s.engine.balancePol).toLocaleString('en-US', { maximumFractionDigits: 4 })} POL`],
          ['Fees por defecto', `Emisión ${s.defaultFeesBps.issuance / 100}% · Rendimiento ${s.defaultFeesBps.yield / 100}%`],
        ]} />
      </div>
      <div>
        <div style={{ ...sub, fontWeight: 600, marginBottom: 8 }}>Contratos</div>
        <KV rows={Object.entries(s.contracts).map(([k, v]) => [CONTRACT_LABEL[k] ?? k, <Hash key={k} value={v} kind="address" chainId={s.chainId} />])} />
      </div>
    </div>
  );
}
