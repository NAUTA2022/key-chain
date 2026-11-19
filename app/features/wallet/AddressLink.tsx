import { useEffect, useState, type CSSProperties } from 'react';
import { isAddress } from 'thirdweb/utils';
import { Icons } from '~/components/ui';
import { appChain, explorerUrl } from '~/lib/onchain';
import { shortAddress } from '~/features/portfolio/format';
import { useT } from '~/i18n/useT';
import { useChainInfo } from './chain';

type AddressLinkProps = {
  value: string;
  kind?: 'address' | 'tx';
  style?: CSSProperties;
};

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

/**
 * Contract / transaction chip (same look as PScanLink): links to the network's
 * block explorer, or copies the value where there is no explorer (devnet).
 */
export default function AddressLink({ value, kind = 'address', style = {} }: AddressLinkProps) {
  const { t } = useT('portfolio');
  const [copied, setCopied] = useState(false);
  const info = useChainInfo();
  // The platform network decides the explorer (none on the devnet → copy instead).
  const chainId = appChain?.id ?? info.data?.chainId;
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const valid = kind === 'address' ? isAddress(value) : TX_HASH.test(value);
  const href = valid && chainId !== undefined ? explorerUrl(kind, value, chainId) : null;
  const pill: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'var(--font-b)', fontSize: 12, color: '#8247E5', textDecoration: 'none',
    padding: '5px 12px', borderRadius: 999, background: 'rgba(130,71,229,0.10)', fontWeight: 600,
    border: 'none', whiteSpace: 'nowrap', ...style,
  };
  const dot = <svg width="12" height="12" viewBox="0 0 24 24" fill="#8247E5" aria-hidden="true"><circle cx="12" cy="12" r="10" /></svg>;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={pill} title={value}>
        {dot}{shortAddress(value)}{Icons.ext}
      </a>
    );
  }
  return (
    <button
      type="button"
      title={value}
      aria-label={copied ? t('wallet.address.copied') : kind === 'tx' ? t('wallet.address.copyTx', { value }) : t('wallet.address.copyAddress', { value })}
      onClick={e => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(value).then(() => setCopied(true), () => undefined);
      }}
      style={{ ...pill, cursor: 'pointer' }}
    >
      {dot}{shortAddress(value)}
      <span style={{ fontSize: 11, opacity: 0.85 }}>{copied ? t('wallet.address.copiedCheck') : t('wallet.address.copy')}</span>
    </button>
  );
}
