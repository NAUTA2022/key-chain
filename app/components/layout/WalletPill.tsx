import { useSyncExternalStore } from 'react';
import { useActiveAccount, useWalletBalance, useWalletDetailsModal } from 'thirdweb/react';
import { polygon } from 'thirdweb/chains';
import { ConnectButton } from '~/components/ConnectButton';
import { useChainInfo } from '~/features/banners/platform';
import { DEV_ACCOUNT, useDevSession } from '~/lib/devLogin';
import type { NavFn } from '~/lib/navigation';
import { appChain } from '~/lib/onchain';
import { useSession } from '~/lib/session';
import { client } from '~/lib/thirdweb';
import { shortAddr, useWallet } from '~/lib/wallet';

function subscribeTheme(onChange: () => void): () => void {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}
const readTheme = (): 'dark' | 'light' => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

const fmtUsdc = (n: number): string => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC`;

/**
 * Topbar account pill: avatar with an online dot, short address and USDC
 * balance. A real wallet opens thirdweb's wallet details; the dev session goes
 * to "Mis Pertenencias". With no account it falls back to the connect button.
 * Balance: on-chain USDC in live mode, the demo custodial balance otherwise.
 */
export function WalletPill({ nav }: { nav: NavFn }) {
  const real = useActiveAccount();
  const dev = useDevSession();
  const { status } = useSession();
  const chainInfo = useChainInfo();
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'dark' as const);
  const details = useWalletDetailsModal();
  const demoUsdc = useWallet().balances.USDC ?? 0;

  const live = status !== 'disabled' && !!real && !!chainInfo;
  const onchain = useWalletBalance(
    { client, chain: appChain ?? polygon, address: real?.address, tokenAddress: chainInfo?.usdc },
    { enabled: live },
  );

  const address = real?.address ?? (dev ? DEV_ACCOUNT.address : undefined);
  if (!address) {
    return (
      <ConnectButton
        client={client}
        chain={appChain ?? polygon}
        connectButton={{ label: 'Conectar', className: 'wallet-pill-connect' }}
        connectModal={{ title: 'Conectar a La 33', titleIcon: '' }}
      />
    );
  }

  const usdc = live ? Number(onchain.data?.displayValue ?? 0) : demoUsdc;
  const open = () => (real ? details.open({ client, theme }) : nav('pertenencias'));

  return (
    <button type="button" className="wallet-pill" onClick={open} title={address} aria-label={`Wallet ${shortAddr(address)}, saldo ${fmtUsdc(usdc)}`}>
      <span className="wallet-pill-av" aria-hidden="true"><span className="wallet-pill-dot" /></span>
      <span className="wallet-pill-txt">
        <span className="wallet-pill-addr">{shortAddr(address)}</span>
        <span className="wallet-pill-bal">{live && onchain.isLoading ? '…' : fmtUsdc(usdc)}</span>
      </span>
    </button>
  );
}
