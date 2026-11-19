import { useSyncExternalStore } from 'react';
import type { Chain } from 'thirdweb/chains';
import { useWalletBalance } from 'thirdweb/react';
import { api, apiEnabled, isProblem } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { appChain, chainFor } from '~/lib/onchain';
import { useSession } from '~/lib/session';
import { client } from '~/lib/thirdweb';
import { useApiData } from '~/features/portfolio/useApiData';

// The platform network (chain info, wallet balances) and the test faucet.

type Json<P extends keyof paths> = paths[P] extends { get: { responses: { 200: { content: { 'application/json': infer T } } } } } ? T : never;

export type ChainInfo = Json<'/v1/chain/info'>;
export type FaucetStatus = Json<'/v1/faucet'>;

// One /chain/info request per page load, shared by every screen.
let chainInfoRequest: Promise<ChainInfo | null> | null = null;
function loadChainInfo(): Promise<ChainInfo | null> {
  chainInfoRequest ??= api.GET('/v1/chain/info').then(r => r.data ?? null);
  return chainInfoRequest.then(info => {
    if (!info) chainInfoRequest = null;
    return info;
  });
}

export function useChainInfo() {
  return useApiData<ChainInfo>(apiEnabled ? 'chain:info' : null, loadChainInfo);
}

/** The network the platform operates on: VITE_CHAIN_ID, else the API's chain. */
export function platformChain(info: ChainInfo | null): Chain | undefined {
  return appChain ?? (info ? chainFor(info.chainId) : undefined);
}

export function networkName(info: ChainInfo | null): string {
  return info?.name ?? appChain?.name ?? 'Polygon';
}

/** Native (gas) and USDC balances of `address` on the platform network. */
export function usePlatformBalances(address: string | undefined) {
  const info = useChainInfo();
  const chain = platformChain(info.data);
  const usdcAddress = info.data?.usdc;
  const native = useWalletBalance({ client, chain, address });
  // Without the USDC address the hook would read the native balance instead.
  const usdc = useWalletBalance({ client, chain, address: usdcAddress ? address : undefined, tokenAddress: usdcAddress });
  return {
    info: info.data,
    chain,
    native: native.data ?? null,
    usdc: usdc.data ?? null,
    loading: info.loading || (Boolean(address) && (native.isLoading || usdc.isLoading || !usdcAddress)),
    refetch: () => {
      void native.refetch();
      void usdc.refetch();
    },
  };
}

export function useFaucetStatus() {
  const { status, user } = useSession();
  return useApiData<FaucetStatus>(status === 'authenticated' && user ? `${user.id}:faucet` : null, async () => (await api.GET('/v1/faucet')).data ?? null);
}

/** Why a faucet request failed; its text is `portfolio:wallet.faucet.errors.<reason>`. */
export type FaucetError = 'cooldown' | 'disabled' | 'failed' | 'network';
export type FaucetResult = { ok: true; usdc: number; gas: number } | { ok: false; reason: FaucetError };

/** Sends test USDC and gas to the signed-in wallet (testnets / devnet only). */
export async function requestFaucet(): Promise<FaucetResult> {
  try {
    const r = await api.POST('/v1/faucet');
    if (r.data) return { ok: true, usdc: r.data.usdc, gas: r.data.gas };
    const error: unknown = r.error;
    const reason = isProblem(error) ? error.reason : undefined;
    if (reason === 'faucet_cooldown') return { ok: false, reason: 'cooldown' };
    if (reason === 'faucet_disabled') return { ok: false, reason: 'disabled' };
    return { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

// A clock for countdowns, shared by every subscriber of the same step.
const clocks = new Map<number, (onChange: () => void) => () => void>();
function clock(step: number) {
  let subscribe = clocks.get(step);
  if (!subscribe) {
    subscribe = onChange => {
      const id = setInterval(onChange, Math.min(step, 30_000));
      return () => clearInterval(id);
    };
    clocks.set(step, subscribe);
  }
  return subscribe;
}

/** Current time rounded down to `step` ms (0 while prerendering). */
export function useNow(step = 1000): number {
  return useSyncExternalStore(clock(step), () => Math.floor(Date.now() / step) * step, () => 0);
}

/** Hours and minutes until `iso` (shown as "5 h 12 min"), or null once it is past. */
export function timeUntil(iso: string | null | undefined, now: number): { h: number; min: number } | null {
  if (!iso || !now) return null;
  const ms = new Date(iso).getTime() - now;
  if (!(ms > 0)) return null;
  const min = Math.ceil(ms / 60_000);
  return { h: Math.floor(min / 60), min: min % 60 };
}
