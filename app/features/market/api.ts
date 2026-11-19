import { getContract, prepareContractCall, readContract, sendAndConfirmTransaction, type Hex } from 'thirdweb';
import type { Chain } from 'thirdweb/chains';
import type { Account, Wallet } from 'thirdweb/wallets';
import { useApiData } from '~/features/portfolio/useApiData';
import { api, apiEnabled } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { type ApiHolding, appChain, chainFor } from '~/lib/onchain';
import { useSession } from '~/lib/session';
import { client } from '~/lib/thirdweb';
import { MarketError } from './i18n';

// Secondary market (FactorActSecondaryMarket): wallets trade with the contract directly.
// The seller approves its tokens and lists; the buyer approves USDC and buys; the token
// itself enforces the ERC-3643 rules. The API only mirrors the contract's events.

type Json<P extends keyof paths, M extends 'get' | 'post'> = paths[P][M] extends { responses: { 200: { content: { 'application/json': infer T } } } }
  ? T
  : paths[P][M] extends { responses: { 201: { content: { 'application/json': infer T } } } }
    ? T
    : never;

export type MarketInfo = Json<'/v1/market/secondary/info', 'get'>;
export type MarketListing = Json<'/v1/market/secondary/listings', 'get'>[number];
export type MarketStats = Json<'/v1/market/secondary/stats', 'get'>;

/** Pool tokens have 18 decimals; the market trades whole tokens. */
const ONE_TOKEN = 10n ** 18n;

const loadInfo = async () => (await api.GET('/v1/market/secondary/info')).data ?? null;
/** Listings plus when they were fetched (for "hace 5 min" without reading the clock while rendering). */
export type ListingsSnapshot = { items: MarketListing[]; at: number };
const loadListings = async (): Promise<ListingsSnapshot | null> => {
  const { data } = await api.GET('/v1/market/secondary/listings');
  return data ? { items: data, at: Date.now() } : null;
};
const loadStats = async () => (await api.GET('/v1/market/secondary/stats')).data ?? null;
const loadMine = async () => (await api.GET('/v1/market/secondary/mine')).data ?? null;

/** The market contract as the API describes it (null when the API does not answer). For the checkout. */
export const fetchMarketInfo = (): Promise<MarketInfo | null> => loadInfo();

/**
 * One active listing by its API id (MarketListing.id), or null when it is gone (sold, withdrawn)
 * or the API does not answer. `assetId` narrows the request to that asset's offers. For the checkout.
 */
export async function fetchListing(id: string, assetId?: number): Promise<MarketListing | null> {
  const { data } = await api.GET('/v1/market/secondary/listings', assetId === undefined ? {} : { params: { query: { assetId } } });
  return data?.find(l => l.id === id) ?? null;
}

export function useMarketInfo() {
  return useApiData<MarketInfo>(apiEnabled ? 'market:info' : null, loadInfo);
}
export function useMarketListings() {
  return useApiData<ListingsSnapshot>(apiEnabled ? 'market:listings' : null, loadListings);
}
export function useMarketStats() {
  return useApiData<MarketStats>(apiEnabled ? 'market:stats' : null, loadStats);
}
/** The signed-in user's listings (every status). */
export function useMyListings() {
  const { status, user } = useSession();
  return useApiData<MarketListing[]>(status === 'authenticated' && user ? `market:mine:${user.walletAddress}` : null, loadMine);
}

export const shortWallet = (w: string) => `${w.slice(0, 6)}…${w.slice(-4)}`;
export const feePercent = (info: MarketInfo) => info.feeBps / 100;
/** What the seller receives for `cost` USDC (the fee comes out of the proceeds). */
export const netOfFee = (cost: number, info: MarketInfo) => cost - Math.floor(cost * 1e6 * info.feeBps / 10_000) / 1e6;

const same = (a: string | null | undefined, b: string | null | undefined) => Boolean(a && b) && a?.toLowerCase() === b?.toLowerCase();

export type TradeStep = 'approve' | 'confirm' | 'sync' | 'done';

/** Wallet/contract failures in plain words (the token's own revert strings first), as `market` i18n keys. */
function tradeError(e: unknown, fallbackKey: string): MarketError {
  const msg = e instanceof Error ? e.message : String(e);
  if (/reject|denied|cancel/i.test(msg)) return new MarketError('errors.walletCancelled', undefined, { cause: e });
  if (/Transfer not possible/i.test(msg)) return new MarketError('errors.transferBlocked', undefined, { cause: e });
  if (/wallet is frozen/i.test(msg)) return new MarketError('errors.sellerFrozen', undefined, { cause: e });
  if (/paused/i.test(msg)) return new MarketError('errors.tradingPaused', undefined, { cause: e });
  if (/exceeds balance|insufficient balance/i.test(msg)) return new MarketError('errors.noBalance', undefined, { cause: e });
  return new MarketError(fallbackKey, undefined, { cause: e });
}

async function ensureChain(wallet: Wallet | undefined, chain: Chain): Promise<void> {
  if (wallet && wallet.getChain()?.id !== chain.id) await wallet.switchChain(chain);
}

/** A check that failed before any transaction was sent (shown as is). */
class PreflightError extends MarketError {}

/** The market the API describes, on the network this build runs on. */
function marketOf(info: MarketInfo | null): { chain: Chain; market: string; usdc: string } {
  if (!info?.enabled || !info.market || !info.paymentToken) throw new PreflightError('errors.marketUnavailable');
  if (info.paused) throw new PreflightError('errors.marketPaused');
  if (appChain && info.chainId !== appChain.id) throw new PreflightError('errors.wrongNetwork');
  return { chain: chainFor(info.chainId), market: info.market, usdc: info.paymentToken };
}

/** Result of a mined trade: `synced` is false when the API has not caught up yet (the worker will). */
export type TradeResult = { synced: boolean; listing: MarketListing | null };

/** Tells the API about a mined transaction. Never throws: the trade already happened on-chain. */
async function syncQuietly(txHash: string): Promise<TradeResult> {
  try {
    const { data } = await api.POST('/v1/market/secondary/sync', { body: { txHash } });
    return { synced: Boolean(data), listing: data?.[0] ?? null };
  } catch {
    return { synced: false, listing: null };
  }
}

/** Token units of `token` the seller already has on sale (their approval must cover these too). */
async function committedOf(chain: Chain, market: string, seller: string, token: string): Promise<bigint> {
  const contract = getContract({ client, chain, address: market });
  return readContract({ contract, method: 'function committed(address seller, address token) view returns (uint256)', params: [seller, token] });
}

/** Whole tokens of a holding that are not on sale yet. */
export async function sellableTokens(info: MarketInfo, holding: ApiHolding, seller: string): Promise<number> {
  const { chain, market } = marketOf(info);
  if (!holding.token) return 0;
  const committed = await committedOf(chain, market, seller, holding.token);
  const free = BigInt(holding.balanceAtomic) - committed;
  return free > 0n ? Number(free / ONE_TOKEN) : 0;
}

/** Lists `quantity` whole tokens at `priceUsd` each: token approval → list → sync. */
export async function sellOnchain(o: {
  info: MarketInfo; holding: ApiHolding; quantity: number; priceUsd: number; account: Account; wallet: Wallet | undefined; onStep: (s: TradeStep) => void;
}): Promise<TradeResult> {
  const { chain, market } = marketOf(o.info);
  const token = o.holding.token;
  if (!token || o.holding.poolStatus !== 'active') throw new MarketError('errors.notTradable');
  if (o.holding.chainId !== o.info.chainId) throw new MarketError('errors.assetOtherNetwork');
  if (!Number.isInteger(o.quantity) || o.quantity < 1) throw new MarketError('errors.wholeTokens');
  const priceAtomic = BigInt(Math.round(o.priceUsd * 1e6));
  if (priceAtomic <= 0n) throw new MarketError('errors.priceAboveZero');
  const amount = BigInt(o.quantity) * ONE_TOKEN;

  let hash: Hex;
  try {
    await ensureChain(o.wallet, chain);
    const marketContract = getContract({ client, chain, address: market });
    const allowed = await readContract({ contract: marketContract, method: 'function isTokenAllowed(address token) view returns (bool)', params: [token] });
    if (!allowed) throw new PreflightError('errors.tokenNotAllowed');
    const committed = await committedOf(chain, market, o.account.address, token);
    if (BigInt(o.holding.balanceAtomic) - committed < amount) throw new PreflightError('errors.notEnoughFree');
    o.onStep('approve');
    const tokenContract = getContract({ client, chain, address: token });
    await sendAndConfirmTransaction({
      account: o.account,
      transaction: prepareContractCall({ contract: tokenContract, method: 'function approve(address spender, uint256 amount) returns (bool)', params: [market, committed + amount] }),
    });
    o.onStep('confirm');
    const receipt = await sendAndConfirmTransaction({
      account: o.account,
      transaction: prepareContractCall({ contract: marketContract, method: 'function list(address token, uint256 amount, uint256 pricePerToken) returns (uint256)', params: [token, amount, priceAtomic] }),
    });
    hash = receipt.transactionHash;
  } catch (e) {
    if (e instanceof PreflightError) throw e;
    throw tradeError(e, 'errors.sellFailed');
  }
  o.onStep('sync');
  const result = await syncQuietly(hash);
  o.onStep('done');
  return result;
}

const LISTING_METHOD =
  'function listings(uint256 listingId) view returns (address seller, uint64 listedAt, bool active, address token, uint256 amount, uint256 remaining, uint256 pricePerToken, uint256 unit)';

/**
 * Buys `quantity` whole tokens of a listing: on-chain check of the offer and the payment token →
 * USDC approval (exact cost) → buy → sync.
 */
export async function buyOnchain(o: {
  info: MarketInfo; listing: MarketListing; quantity: number; account: Account; wallet: Wallet | undefined; onStep: (s: TradeStep) => void;
}): Promise<TradeResult> {
  const { chain, market, usdc } = marketOf(o.info);
  if (!same(o.listing.market, market) || o.listing.chainId !== o.info.chainId) throw new MarketError('errors.foreignListing');
  if (same(o.listing.sellerWallet, o.account.address)) throw new MarketError('errors.ownOffer');
  if (!Number.isInteger(o.quantity) || o.quantity < 1 || o.quantity > Math.floor(o.listing.available)) throw new MarketError('errors.pickAvailable');
  const amount = BigInt(o.quantity) * ONE_TOKEN;
  // Whole tokens: the cost is exact (quantity × price); it is also the most the contract may charge.
  const cost = BigInt(o.quantity) * BigInt(o.listing.priceAtomic);

  let hash: Hex;
  try {
    await ensureChain(o.wallet, chain);
    const marketContract = getContract({ client, chain, address: market });
    // Defence in depth: the offer and the payment token are read from the contract, not trusted from the API.
    const [paymentToken, onchain] = await Promise.all([
      readContract({ contract: marketContract, method: 'function paymentToken() view returns (address)', params: [] }),
      readContract({ contract: marketContract, method: LISTING_METHOD, params: [BigInt(o.listing.onchainId)] }),
    ]);
    const [seller, , active, token, , remaining, pricePerToken, unit] = onchain;
    if (!same(paymentToken, usdc)) throw new PreflightError('errors.paymentTokenMismatch');
    if (!active || remaining < amount) throw new PreflightError('errors.offerGoneRefresh');
    if (!same(seller, o.listing.sellerWallet) || !same(token, o.listing.token) || pricePerToken !== BigInt(o.listing.priceAtomic) || unit !== ONE_TOKEN) {
      throw new PreflightError('errors.offerMismatch');
    }
    const usdcContract = getContract({ client, chain, address: paymentToken });
    const balance = await readContract({ contract: usdcContract, method: 'function balanceOf(address account) view returns (uint256)', params: [o.account.address] });
    if (balance < cost) throw new PreflightError('errors.noUsdc');
    o.onStep('approve');
    await sendAndConfirmTransaction({
      account: o.account,
      transaction: prepareContractCall({ contract: usdcContract, method: 'function approve(address spender, uint256 amount) returns (bool)', params: [market, cost] }),
    });
    o.onStep('confirm');
    const receipt = await sendAndConfirmTransaction({
      account: o.account,
      transaction: prepareContractCall({ contract: marketContract, method: 'function buy(uint256 listingId, uint256 amount, uint256 maxCost) returns (uint256)', params: [BigInt(o.listing.onchainId), amount, cost] }),
    });
    hash = receipt.transactionHash;
  } catch (e) {
    if (e instanceof PreflightError) throw e;
    throw tradeError(e, 'errors.buyFailed');
  }
  o.onStep('sync');
  const result = await syncQuietly(hash);
  o.onStep('done');
  return result;
}

/** Withdraws one of the user's listings. */
export async function cancelOnchain(o: { info: MarketInfo; listing: MarketListing; account: Account; wallet: Wallet | undefined }): Promise<TradeResult> {
  const { chain, market } = marketOf({ ...o.info, paused: false }); // cancelling works while paused
  if (!same(o.listing.market, market)) throw new MarketError('errors.foreignListing');
  let hash: Hex;
  try {
    await ensureChain(o.wallet, chain);
    const contract = getContract({ client, chain, address: market });
    const receipt = await sendAndConfirmTransaction({
      account: o.account,
      transaction: prepareContractCall({ contract, method: 'function cancel(uint256 listingId)', params: [BigInt(o.listing.onchainId)] }),
    });
    hash = receipt.transactionHash;
  } catch (e) {
    throw tradeError(e, 'errors.cancelFailed');
  }
  return syncQuietly(hash);
}
