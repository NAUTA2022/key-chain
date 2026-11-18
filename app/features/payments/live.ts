import type { PayNetwork, PayToken } from '~/lib/wallet';

// Live mode: the only network and token the payment flows offer are the
// platform's own (VITE_CHAIN_ID / the API's chain) and its USDC.

export const PLATFORM_NET = 'platform';

/** The platform network as a payment-flow option (no invented ETA or confirmation counts). */
export function platformNetwork(name: string, chainId: number | undefined, gasSymbol: string): PayNetwork {
  const polygon = chainId === 137 || chainId === 80002;
  return { id: PLATFORM_NET, name, icon: polygon ? '/crypto/matic.svg' : '/icono.png', fee: 0, eta: '', confirmations: 0, sub: `Red de la plataforma · gas en ${gasSymbol}` };
}

export const LIVE_USDC: PayToken = { sym: 'USDC', name: 'USD Coin', icon: '/crypto/usdc.svg', price: 1, decimals: 2, networks: [PLATFORM_NET], min: 0 };
