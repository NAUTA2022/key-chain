// KEYCHAIN custodial wallet (demo): balances per token, the user's deposit
// address, supported networks and the activity feed. Deposits, withdrawals
// and checkout payments all read and write here. No backend: an in-memory
// store with a tiny pub-sub (resets on reload, like the rest of the demo).
import { useSyncExternalStore } from 'react';
import { TRANSACTIONS } from './walletActivity';

export const DEPOSIT_ADDRESS = '0x4a9fE2b8C31d7E0a9b6F51c2E8d4A7b3F90d82c';

export const NETWORKS = {
  polygon: { id: 'polygon', name: 'Polygon',         icon: '/crypto/matic.svg', fee: 0.08, eta: '~2 min',  confirmations: 12 },
  bnb:     { id: 'bnb',     name: 'BNB Smart Chain', icon: '/crypto/bnb.svg',   fee: 0.25, eta: '~3 min',  confirmations: 15 },
  celo:    { id: 'celo',    name: 'Celo',            icon: '/crypto/celo.png',  fee: 0.02, eta: '~1 min',  confirmations: 6 },
};

export const TOKENS = [
  { sym: 'USDC', name: 'USD Coin',      icon: '/crypto/usdc.svg',  price: 1,    decimals: 2, networks: ['polygon', 'bnb', 'celo'], min: 5 },
  { sym: 'USDT', name: 'Tether',        icon: '/crypto/usdt.svg',  price: 1,    decimals: 2, networks: ['polygon', 'bnb', 'celo'], min: 5 },
  { sym: 'ETH',  name: 'Ethereum',      icon: '/crypto/eth.svg',   price: 3420, decimals: 5, networks: ['polygon', 'bnb'],         min: 0.002 },
  { sym: 'POL',  name: 'Polygon',       icon: '/crypto/matic.svg', price: 0.52, decimals: 2, networks: ['polygon'],                min: 10 },
];
export const tokenBySym = (s) => TOKENS.find(t => t.sym === s);

// Stablecoins accepted for payments inside the platform.
export const PAY_TOKENS = ['USDC', 'USDT'];

let state = {
  balances: { USDC: 12480.5, USDT: 1250, ETH: 0.42, POL: 340.2 },
  activity: TRANSACTIONS.map(t => ({ ...t, sym: t.wallet === 'kycn' ? 'KYCN' : 'USDC' })),
};
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn());
const set = (next) => { state = { ...state, ...next }; emit(); };

const today = () => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
export const fakeTxHash = () => '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

function log(entry) {
  set({ activity: [{ id: Date.now() + Math.random(), date: today(), status: 'Completado', ...entry }, ...state.activity] });
}

export function credit(sym, amount, label, extra = {}) {
  set({ balances: { ...state.balances, [sym]: (state.balances[sym] || 0) + amount } });
  log({ type: 'in', label, amount, sym, ...extra });
}

// Returns false (and changes nothing) if the balance isn't enough.
export function debit(sym, amount, label, extra = {}) {
  if ((state.balances[sym] || 0) + 1e-9 < amount) return false;
  set({ balances: { ...state.balances, [sym]: state.balances[sym] - amount } });
  log({ type: 'out', label, amount: -amount, sym, ...extra });
  return true;
}

export function logPayment(label, amount, sym, extra = {}) {
  log({ type: 'out', label, amount: -amount, sym, ...extra });
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const snapshot = () => state;
export function useWallet() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export const isAddress = (v) => /^0x[a-fA-F0-9]{40}$/.test(String(v).trim());
export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
export const fmtToken = (n, sym) => {
  const t = tokenBySym(sym);
  const d = t ? t.decimals : 2;
  return `${Number(n).toLocaleString('es-AR', { minimumFractionDigits: Math.min(2, d), maximumFractionDigits: d })} ${sym}`;
};
