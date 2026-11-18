import type { ReactNode } from 'react';
import { PCard, PDiv, PDonut } from '~/components/ui';
import { fmtUSD2, type RwaAsset } from '~/data';
import type { ApiAssetDto, CatalogAsset } from '~/lib/catalog';
import { fmtLongDate } from '~/features/portfolio/format';
import AddressLink from '~/features/wallet/AddressLink';
import { networkName, useChainInfo } from '~/features/wallet/chain';
import { usePublicSettings } from './api';

type PoolStatus = NonNullable<ApiAssetDto['pool']>['status'];

const POOL_STATUS: Record<PoolStatus, string> = {
  deploying: 'Desplegando contratos',
  granting_roles: 'Configurando permisos',
  active: 'Activo on-chain',
  liquidated: 'Liquidado',
  failed: 'Despliegue fallido',
};

type LiveTokenomicsProps = {
  asset: RwaAsset & { pool?: CatalogAsset['pool'] };
  dto: ApiAssetDto | null;
  mobile: boolean;
};

/** Tokenomics with real contract addresses, fee and distribution schedule. */
export default function LiveTokenomics({ asset: a, dto, mobile }: LiveTokenomicsProps) {
  const settings = usePublicSettings();
  const chain = useChainInfo();
  const network = networkName(chain.data);
  const pool = dto?.pool ?? a.pool ?? null;
  const sold = Math.round(a.totalTokens * a.sold / 100);
  const fee = settings.data ? `${settings.data.displayFeePercent.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%` : '—';
  const frequency = dto?.distributionFrequency;

  const rows: Array<readonly [string, ReactNode]> = [
    ['Estado', pool ? POOL_STATUS[pool.status] : 'Todavía no tokenizado on-chain'],
    ...(pool?.token ? [['Token del activo', <AddressLink key="t" value={pool.token} />] as const] : []),
    ...(pool?.vault ? [['Vault (custodia de USDC)', <AddressLink key="v" value={pool.vault} />] as const] : []),
    ['Próxima distribución', dto?.nextDistributionAt ? fmtLongDate(dto.nextDistributionAt) : 'Sin fecha programada'],
  ];

  return (
    <PCard style={{ padding: mobile ? '18px 16px' : '22px 24px' }}>
      <div style={{ display: 'flex', gap: mobile ? 20 : 30, alignItems: 'center', marginBottom: 20, flexDirection: mobile ? 'column' : 'row' }}>
        <PDonut size={150} label={`${a.sold}%`} sub="vendido" segments={[
          { value: a.sold, color: 'var(--accent)' },
          { value: 100 - a.sold, color: 'var(--surface2)' },
        ]} />
        <div style={{ flex: 1, width: mobile ? '100%' : undefined, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {([
            ['Supply total', a.totalTokens.toLocaleString()],
            ['Vendidos', sold.toLocaleString()],
            ['Disponibles', (a.totalTokens - sold).toLocaleString()],
            ['Precio token', `${fmtUSD2(a.tokenPrice)} USDC`],
            ['Min. inversión', '1 token'],
            ['Fee plataforma', fee],
            ['Distribución', frequency ? `${frequency} · USDC` : '—'],
            ['Estándar', `ERC-3643 · ${network}`],
          ] as const).map(([k, v]) => (
            <div key={k} style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-b)', fontSize: 11.5, color: 'var(--ter)', marginBottom: 3 }}>{k}</div>
              <div style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 16, color: 'var(--text)', overflowWrap: 'anywhere' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <PDiv style={{ margin: '6px 0 6px' }} />
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-b)', fontSize: 13, color: 'var(--sec)' }}>{k}</span>
          {typeof v === 'string'
            ? <span style={{ fontFamily: 'var(--font-h)', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{v}</span>
            : v}
        </div>
      ))}
      {!pool?.token && (
        <div style={{ fontFamily: 'var(--font-b)', fontSize: 12.5, color: 'var(--ter)', marginTop: 4 }}>
          Los contratos del activo se publican acá cuando se despliega on-chain.
        </div>
      )}
    </PCard>
  );
}
