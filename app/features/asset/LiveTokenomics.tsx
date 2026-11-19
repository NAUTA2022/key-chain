import type { ReactNode } from 'react';
import { PCard, PDiv, PDonut } from '~/components/ui';
import { fmtUSD2, type RwaAsset } from '~/data';
import type { ApiAssetDto, CatalogAsset } from '~/lib/catalog';
import { fmtLongDate } from '~/features/portfolio/format';
import AddressLink from '~/features/wallet/AddressLink';
import { networkName, useChainInfo } from '~/features/wallet/chain';
import { useT } from '~/i18n/useT';
import { usePublicSettings } from './api';

type PoolStatus = NonNullable<ApiAssetDto['pool']>['status'];

type LiveTokenomicsProps = {
  asset: RwaAsset & { pool?: CatalogAsset['pool'] };
  dto: ApiAssetDto | null;
  mobile: boolean;
};

/** Tokenomics with real contract addresses, fee and distribution schedule. */
export default function LiveTokenomics({ asset: a, dto, mobile }: LiveTokenomicsProps) {
  const settings = usePublicSettings();
  const { t, locale } = useT('market');
  const chain = useChainInfo();
  const network = networkName(chain.data);
  const pool = dto?.pool ?? a.pool ?? null;
  const sold = Math.round(a.totalTokens * a.sold / 100);
  const fee = settings.data ? `${settings.data.displayFeePercent.toLocaleString(locale, { maximumFractionDigits: 2 })}%` : '—';
  const frequency = dto?.distributionFrequency;

  const rows: Array<readonly [string, ReactNode]> = [
    [t('tokenomics.status'), pool ? t(`tokenomics.poolStatus.${pool.status satisfies PoolStatus}`) : t('tokenomics.notTokenized')],
    ...(pool?.token ? [[t('tokenomics.assetToken'), <AddressLink key="t" value={pool.token} />] as const] : []),
    ...(pool?.vault ? [[t('tokenomics.vault'), <AddressLink key="v" value={pool.vault} />] as const] : []),
    [t('tokenomics.nextDistribution'), dto?.nextDistributionAt ? fmtLongDate(dto.nextDistributionAt) : t('tokenomics.noDate')],
  ];

  return (
    <PCard style={{ padding: mobile ? '18px 16px' : '22px 24px' }}>
      <div style={{ display: 'flex', gap: mobile ? 20 : 30, alignItems: 'center', marginBottom: 20, flexDirection: mobile ? 'column' : 'row' }}>
        <PDonut size={150} label={`${a.sold}%`} sub={t('tokenomics.sold')} segments={[
          { value: a.sold, color: 'var(--accent)' },
          { value: 100 - a.sold, color: 'var(--surface2)' },
        ]} />
        <div style={{ flex: 1, width: mobile ? '100%' : undefined, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {([
            [t('tokenomics.totalSupply'), a.totalTokens.toLocaleString()],
            [t('tokenomics.soldCount'), sold.toLocaleString()],
            [t('tokenomics.available'), (a.totalTokens - sold).toLocaleString()],
            [t('tokenomics.tokenPrice'), `${fmtUSD2(a.tokenPrice)} USDC`],
            [t('tokenomics.minInvestment'), t('tokenomics.oneToken')],
            [t('tokenomics.platformFee'), fee],
            [t('tokenomics.distribution'), frequency ? `${frequency} · USDC` : '—'],
            [t('tokenomics.standard'), `ERC-3643 · ${network}`],
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
          {t('tokenomics.contractsNote')}
        </div>
      )}
    </PCard>
  );
}
