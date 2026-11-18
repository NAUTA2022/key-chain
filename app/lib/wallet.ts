// KEYCHAIN custodial wallet (demo): balances per token, the user's deposit
// address, supported networks and the activity feed. Deposits, withdrawals
// and checkout payments all read and write here. No backend: an in-memory
// store with a tiny pub-sub (resets on reload, like the rest of the demo).
// Live mode never reads this store: balances and activity come from the
// chain and the API (see app/pages/Holdings.tsx and app/pages/Checkout.tsx).
import { useSyncExternalStore } from 'react';
import { TRANSACTIONS } from './walletActivity';

export const DEPOSIT_ADDRESS = '0x4a9fE2b8C31d7E0a9b6F51c2E8d4A7b3F90d82c';

/** A network funds can travel on: the demo networks, or the platform network in live mode. */
export type PayNetwork = {
  id: string;
  name: string;
  icon: string;
  /** Network fee in USD (0 when the user pays gas in the native token instead). */
  fee: number;
  eta: string;
  confirmations: number;
  /** Replaces the "Llega en … · N confirmaciones" line when the figures are unknown (live). */
  sub?: string;
};

/** A token the wallet holds or can move. */
export type PayToken = {
  sym: string;
  name: string;
  icon: string;
  price: number;
  decimals: number;
  /** Ids of the networks it can travel on (keys of the network map in use). */
  networks: readonly string[];
  min: number;
};

export type NetworkId = 'polygon' | 'bnb' | 'celo';

export const NETWORKS: Record<NetworkId, PayNetwork> = {
  polygon: { id: 'polygon', name: 'Polygon',         icon: '/crypto/matic.svg', fee: 0.08, eta: '~2 min',  confirmations: 12 },
  bnb:     { id: 'bnb',     name: 'BNB Smart Chain', icon: '/crypto/bnb.svg',   fee: 0.25, eta: '~3 min',  confirmations: 15 },
  celo:    { id: 'celo',    name: 'Celo',            icon: '/crypto/celo.png',  fee: 0.02, eta: '~1 min',  confirmations: 6 },
};

export const TOKENS: readonly PayToken[] = [
  { sym: 'USDC', name: 'USD Coin',      icon: '/crypto/usdc.svg',  price: 1,    decimals: 2, networks: ['polygon', 'bnb', 'celo'], min: 5 },
  { sym: 'USDT', name: 'Tether',        icon: '/crypto/usdt.svg',  price: 1,    decimals: 2, networks: ['polygon', 'bnb', 'celo'], min: 5 },
  { sym: 'ETH',  name: 'Ethereum',      icon: '/crypto/eth.svg',   price: 3420, decimals: 5, networks: ['polygon', 'bnb'],         min: 0.002 },
  { sym: 'POL',  name: 'Polygon',       icon: '/crypto/matic.svg', price: 0.52, decimals: 2, networks: ['polygon'],                min: 10 },
];

/** The token with that symbol (USDC for an unknown one). */
export const tokenBySym = (s: string): PayToken => TOKENS.find(t => t.sym === s) ?? TOKENS[0];

/** The network with that id (Polygon for an unknown one). */
export const networkById = (id: string): PayNetwork => (id in NETWORKS ? NETWORKS[id as NetworkId] : NETWORKS.polygon);

// Stablecoins accepted for payments inside the platform.
export const PAY_TOKENS: readonly string[] = ['USDC', 'USDT'];

/** One line of the wallet activity (Movimientos). */
export type WalletActivity = {
  id: number;
  type: 'in' | 'out';
  label: string;
  amount: number;
  date: string;
  status: string;
  sym: string;
  source?: string;
  net?: string;
  hash?: string;
};

export type WalletState = { balances: Readonly<Record<string, number>>; activity: readonly WalletActivity[] };

/** Extra fields stored with a movement (where it came from, network, tx hash). */
export type ActivityExtra = { source?: string; net?: string; hash?: string };

let state: WalletState = {
  balances: { USDC: 12480.5, USDT: 1250, ETH: 0.42, POL: 340.2 },
  activity: TRANSACTIONS.map(t => ({ id: t.id, type: t.type, label: t.label, amount: t.amount, date: t.date, status: t.status, sym: t.wallet === 'kycn' ? 'KYCN' : 'USDC' })),
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());
const set = (next: Partial<WalletState>) => { state = { ...state, ...next }; emit(); };

const today = () => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
export const fakeTxHash = () => '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

function log(entry: Omit<WalletActivity, 'id' | 'date' | 'status'>) {
  set({ activity: [{ id: Date.now() + Math.random(), date: today(), status: 'Completado', ...entry }, ...state.activity] });
}

export function credit(sym: string, amount: number, label: string, extra: ActivityExtra = {}): void {
  set({ balances: { ...state.balances, [sym]: (state.balances[sym] || 0) + amount } });
  log({ type: 'in', label, amount, sym, ...extra });
}

// Returns false (and changes nothing) if the balance isn't enough.
export function debit(sym: string, amount: number, label: string, extra: ActivityExtra = {}): boolean {
  if ((state.balances[sym] || 0) + 1e-9 < amount) return false;
  set({ balances: { ...state.balances, [sym]: (state.balances[sym] || 0) - amount } });
  log({ type: 'out', label, amount: -amount, sym, ...extra });
  return true;
}

export function logPayment(label: string, amount: number, sym: string, extra: ActivityExtra = {}): void {
  log({ type: 'out', label, amount: -amount, sym, ...extra });
}

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const snapshot = () => state;
export function useWallet(): WalletState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export const isAddress = (v: string) => /^0x[a-fA-F0-9]{40}$/.test(String(v).trim());
export const shortAddr = (a: string | null | undefined) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
export const fmtToken = (n: number, sym: string) => {
  const t = TOKENS.find(x => x.sym === sym);
  const d = t ? t.decimals : 2;
  return `${Number(n).toLocaleString('es-AR', { minimumFractionDigits: Math.min(2, d), maximumFractionDigits: d })} ${sym}`;
};
