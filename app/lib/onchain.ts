import { useCallback, useEffect, useState } from 'react';
import { getContract, prepareContractCall, sendAndConfirmTransaction, type Hex } from 'thirdweb';
import { defineChain, polygon, polygonAmoy, type Chain } from 'thirdweb/chains';
import { approve } from 'thirdweb/extensions/erc20';
import type { Account, Wallet } from 'thirdweb/wallets';
import { api, apiEnabled, isProblem } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { useSession } from '~/lib/session';
import { client } from '~/lib/thirdweb';

// On-chain investing (ERC-3643 asset pools). The backend prices and executes;
// the investor's wallet only approves USDC and claims what it is owed.

type Ok<P extends keyof paths, M extends 'get' | 'post' | 'put'> = paths[P][M] extends { responses: { 200: { content: { 'application/json': infer T } } } }
  ? T
  : paths[P][M] extends { responses: { 201: { content: { 'application/json': infer T } } } }
    ? T
    : never;

export type ApiAsset = Ok<'/v1/assets/{idOrSlug}', 'get'>;
export type ApiHolding = Ok<'/v1/me/holdings', 'get'>[number];
export type ApiDividend = Ok<'/v1/me/dividends', 'get'>[number];
export type ApiOrder = Ok<'/v1/market/orders/{id}', 'get'>;
export type KycStatus = Ok<'/v1/kyc', 'get'>;

/** Brikme Devnet: the private test network (its gas token is shown as POL, like Polygon). */
export const DEVNET_CHAIN_ID = 202610;

/** thirdweb chain for a chain id returned by the API. */
export function chainFor(chainId: number): Chain {
  if (chainId === 137) return polygon;
  if (chainId === 80002) return polygonAmoy;
  const devnet = chainId === DEVNET_CHAIN_ID;
  return defineChain({
    id: chainId,
    name: devnet ? 'Brikme Devnet' : chainId === 31337 ? 'Local (anvil)' : `Chain ${chainId}`,
    rpc: import.meta.env.VITE_CHAIN_RPC_URL || 'http://127.0.0.1:8545',
    nativeCurrency: devnet ? { name: 'POL (pruebas)', symbol: 'POL', decimals: 18 } : { name: 'Ether', symbol: 'ETH', decimals: 18 },
    testnet: true,
  });
}

/** Block explorer link for an address or transaction on the platform network; null when there is no explorer (devnet). */
export function explorerUrl(kind: 'address' | 'tx', value: string, chainId?: number): string | null {
  const id = chainId ?? appChain?.id ?? 137;
  const base = id === 137 ? 'https://polygonscan.com' : id === 80002 ? 'https://amoy.polygonscan.com' : null;
  return base ? `${base}/${kind}/${value}` : null;
}

/**
 * The network the platform operates on (VITE_CHAIN_ID: 80002 Amoy, 137 Polygon,
 * 31337 local). Undefined keeps each ConnectButton's own default chain.
 */
export const appChain: Chain | undefined = import.meta.env.VITE_CHAIN_ID ? chainFor(Number(import.meta.env.VITE_CHAIN_ID)) : undefined;

/** Human message for an API problem (RFC 9457), in Spanish for the UI. */
export function problemMessage(error: unknown, fallback: string): string {
  if (!isProblem(error)) return fallback;
  switch (error.reason) {
    case 'not_verified': return 'Tu wallet todavía no está verificada. Completa el KYC en tu perfil.';
    case 'insufficient_balance': return 'No tienes USDC suficiente en tu wallet.';
    case 'insufficient_allowance': return 'Falta autorizar el USDC para esta inversión.';
    default: return error.title || fallback;
  }
}

/** An investment that could not proceed; `reason` is the API's machine-readable cause (e.g. 'insufficient_balance', 'not_verified', 'investments_paused'). */
export class InvestError extends Error {
  constructor(message: string, readonly reason: string | null = null, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'InvestError';
  }
}

const reasonOf = (error: unknown): string | null => (isProblem(error) && typeof error.reason === 'string' ? error.reason : null);

function walletError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/reject|denied|cancel/i.test(msg)) return 'Operación cancelada en la wallet.';
  return 'La transacción no se pudo completar.';
}

async function ensureChain(wallet: Wallet | undefined, chain: Chain): Promise<void> {
  if (wallet && wallet.getChain()?.id !== chain.id) await wallet.switchChain(chain);
}

/** Tiny fetch-on-mount hook for authenticated reads; `reload` refetches. */
function useAuthedData<T>(load: () => Promise<T | null>, enabled: boolean): { data: T | null; loading: boolean; reload: () => void } {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<{ tick: number; data: T | null } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    load()
      .then(data => alive && setResult({ tick, data }))
      .catch(() => alive && setResult({ tick, data: null }));
    return () => {
      alive = false;
    };
    // `load` is stable per call site (module-level fetchers below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick]);
  return {
    data: enabled ? (result?.data ?? null) : null,
    loading: enabled && result?.tick !== tick,
    reload: useCallback(() => setTick(t => t + 1), []),
  };
}

const fetchHoldings = async () => (await api.GET('/v1/me/holdings')).data ?? null;
const fetchDividends = async () => (await api.GET('/v1/me/dividends')).data ?? null;
const fetchKyc = async () => (await api.GET('/v1/kyc')).data ?? null;

/** The investor's real positions (null = demo mode or signed out). */
export function useHoldings() {
  const { status } = useSession();
  return useAuthedData(fetchHoldings, status === 'authenticated');
}

export function useDividends() {
  const { status } = useSession();
  return useAuthedData(fetchDividends, status === 'authenticated');
}

export function useKyc() {
  const { status, user, refresh } = useSession();
  const kyc = useAuthedData(fetchKyc, status === 'authenticated');
  // The session copy of the KYC status (header badge, invest gates) is read at login: when the
  // fresh one differs (approved or rejected since), re-read the session so every screen agrees.
  const fresh = kyc.data?.status;
  const stale = Boolean(fresh && user && fresh !== user.kycStatus);
  useEffect(() => {
    if (stale) void refresh();
  }, [stale, refresh]);
  return kyc;
}

/** The API view of an asset (pool status, contracts). Public: no session needed. */
export function useApiAsset(id: number) {
  const [asset, setAsset] = useState<ApiAsset | null>(null);
  useEffect(() => {
    if (!apiEnabled) return;
    let alive = true;
    api.GET('/v1/assets/{idOrSlug}', { params: { path: { idOrSlug: String(id) } } })
      .then(r => alive && setAsset(r.data ?? null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id]);
  return asset;
}

export type InvestStep = 'order' | 'approve' | 'execute' | 'minting' | 'done';

/**
 * Full investment: order (priced by the API) → USDC approval to the pool vault
 * from the investor's wallet → execution by the backend → wait for the mint.
 */
export async function investOnchain(opts: {
  assetId: number; quantity: number; account: Account; wallet: Wallet | undefined; onStep: (s: InvestStep) => void;
}): Promise<ApiOrder> {
  opts.onStep('order');
  const { data: order, error: createError }: { data?: ApiOrder; error?: unknown } = await api.POST('/v1/market/orders', { body: { assetId: opts.assetId, quantity: opts.quantity } });
  if (!order) throw new InvestError(problemMessage(createError, 'No se pudo crear la orden.'), reasonOf(createError));
  if (order.mode !== 'onchain' || !order.payment) throw new Error('Este activo todavía no está tokenizado on-chain.');
  const pay = order.payment;
  if (pay.walletAddress.toLowerCase() !== opts.account.address.toLowerCase()) throw new Error('La wallet conectada no es la de tu sesión.');
  // Defence in depth: only approve the asset's own vault, for its stablecoin, on the platform's network.
  const { data: asset } = await api.GET('/v1/assets/{idOrSlug}', { params: { path: { idOrSlug: String(opts.assetId) } } });
  const pool = asset?.pool;
  const same = (a: string | null | undefined, b: string) => Boolean(a) && a?.toLowerCase() === b.toLowerCase();
  if ((appChain && pay.chainId !== appChain.id) || !pool || !same(pool.vault, pay.spender) || !same(pool.stablecoin, pay.token)) {
    throw new Error('Los datos de pago no coinciden con el contrato del activo. No se envió ninguna aprobación.');
  }

  opts.onStep('approve');
  const chain = chainFor(pay.chainId);
  try {
    await ensureChain(opts.wallet, chain);
    const usdc = getContract({ client, chain, address: pay.token });
    await sendAndConfirmTransaction({ account: opts.account, transaction: approve({ contract: usdc, spender: pay.spender, amountWei: BigInt(pay.amountAtomic) }) });
  } catch (e) {
    throw new Error(walletError(e), { cause: e });
  }

  opts.onStep('execute');
  const { data: executed, error: execError }: { data?: ApiOrder; error?: unknown } = await api.POST('/v1/market/orders/{id}/execute', { params: { path: { id: order.id } } });
  if (!executed) throw new InvestError(problemMessage(execError, 'No se pudo ejecutar la inversión.'), reasonOf(execError));

  opts.onStep('minting');
  for (let i = 0; i < 120; i++) {
    const r = await api.GET('/v1/market/orders/{id}', { params: { path: { id: order.id } } });
    if (r.data?.status === 'minted') {
      opts.onStep('done');
      return r.data;
    }
    if (r.data?.status === 'failed') throw new Error(r.data.error ? 'La inversión fue rechazada on-chain.' : 'La inversión falló.');
    await new Promise(res => setTimeout(res, 1500));
  }
  throw new Error('La inversión sigue en proceso. Revisa tus pertenencias en unos minutos.');
}

/** Claims a sealed dividend with its Merkle proof, from the investor's wallet. */
export async function claimDividend(d: ApiDividend, account: Account, wallet: Wallet | undefined): Promise<void> {
  if (!d.distributor) throw new Error('Distribución no disponible.');
  const chain = chainFor(d.chainId);
  try {
    await ensureChain(wallet, chain);
    const contract = getContract({ client, chain, address: d.distributor });
    const transaction = prepareContractCall({
      contract,
      method: 'function claim(uint256 snapshotId, uint256 dividendAmount, bytes32[] merkleProof)',
      params: [BigInt(d.snapshotId), BigInt(d.amountAtomic), d.proof as Hex[]],
    });
    await sendAndConfirmTransaction({ account, transaction });
  } catch (e) {
    throw new Error(walletError(e), { cause: e });
  }
}

/** After a liquidation: burns the tokens and receives the USDC payout. */
export async function claimCapital(h: ApiHolding, account: Account, wallet: Wallet | undefined): Promise<void> {
  if (!h.liquidationManager) throw new Error('Liquidación no disponible.');
  const chain = chainFor(h.chainId);
  try {
    await ensureChain(wallet, chain);
    const contract = getContract({ client, chain, address: h.liquidationManager });
    const transaction = prepareContractCall({ contract, method: 'function claimCapital(uint256 tokenAmount)', params: [BigInt(h.balanceAtomic)] });
    await sendAndConfirmTransaction({ account, transaction });
  } catch (e) {
    throw new Error(walletError(e), { cause: e });
  }
}
