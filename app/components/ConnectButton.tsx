import { useSyncExternalStore, type ComponentProps } from 'react';
import { ConnectButton as ThirdwebConnectButton, darkTheme, lightTheme } from 'thirdweb/react';
import { useChainInfo } from '~/features/banners/platform';
import { appChain } from '~/lib/onchain';
import { useSession } from '~/lib/session';

type Props = ComponentProps<typeof ThirdwebConnectButton>;

/** The app's current theme (data-theme on <html>), so thirdweb's own UI (button, details, modal) follows it. */
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}
const currentTheme = (): 'light' | 'dark' => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

const LIGHT_THEME = lightTheme({
  colors: { primaryText: '#0f1219', secondaryText: '#5b6270', accentText: '#0f1219', primaryButtonBg: '#1c1f26', primaryButtonText: '#ffffff', modalBg: '#ffffff', borderColor: '#e2e4e9' },
});
const DARK_THEME = darkTheme({ colors: { modalBg: '#0e1014', borderColor: 'rgba(255,255,255,0.12)' } });

/**
 * thirdweb ConnectButton wired to the backend session: when the API is enabled,
 * connecting a wallet also signs the SIWE message and opens a server session,
 * and the details button shows the wallet's USDC balance on the platform network.
 */
export function ConnectButton(props: Props) {
  const { connectAuth, status } = useSession();
  const appTheme = useSyncExternalStore(subscribeTheme, currentTheme, () => 'light' as const);
  const chainInfo = useChainInfo();
  // USDC address from GET /v1/chain/info; skipped if the API reports another network than VITE_CHAIN_ID.
  const sameChain = chainInfo !== null && (!appChain || appChain.id === chainInfo.chainId);
  const usdcBalance = status !== 'disabled' && chainInfo && sameChain && !props.detailsButton?.displayBalanceToken
    ? { [chainInfo.chainId]: chainInfo.usdc }
    : undefined;
  const detailsButton = usdcBalance ? { ...props.detailsButton, displayBalanceToken: usdcBalance } : props.detailsButton;
  // The platform's network (VITE_CHAIN_ID) wins over per-page defaults so users are asked to switch only when needed.
  return <ThirdwebConnectButton theme={appTheme === 'dark' ? DARK_THEME : LIGHT_THEME} {...props} detailsButton={detailsButton} chain={appChain ?? props.chain} auth={props.auth ?? connectAuth} />;
}
