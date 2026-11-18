import { useSyncExternalStore } from 'react';
import { apiEnabled } from '~/lib/api/client';

// Developer-only tooling ("Entrar dev" button, per-project state banner). No wallet code here, so the
// landing can use it without pulling thirdweb into its chunk (wallet hooks live in devSession.ts).
// Only enabled in `npm run dev` or when the build sets VITE_DEV_LOGIN=true —
// never in a normal production build.
const devLoginFlag: unknown = import.meta.env.VITE_DEV_LOGIN;
export const DEV_MODE: boolean = import.meta.env.DEV || devLoginFlag === 'true';

/**
 * "Entrar dev" is available only with the developer tooling AND in demo mode
 * (no VITE_API_URL): with the backend, every session is a real SIWE session.
 */
export const DEV_LOGIN: boolean = DEV_MODE && !apiEnabled;

// "Entrar dev": a fake session that lets you get past every login gate
// without connecting a wallet through thirdweb, so the app can be tested
// anywhere (e.g. the cloud preview).
const KEY = 'kc_dev_session';

export type DevAccount = { readonly address: `0x${string}`; readonly isDev: true };
export const DEV_ACCOUNT: DevAccount = { address: '0xDeDe00000000000000000000000000000000DeDe', isDev: true };

const listeners = new Set<() => void>();
// Read lazily on the client (never during prerender, where there is no storage).
let active: boolean | null = null;

function readFlag(): boolean {
  if (!DEV_LOGIN) return false;
  try { return window.localStorage.getItem(KEY) === '1'; } catch { return false; }
}

function getActive(): boolean {
  if (active === null) active = readFlag();
  return active;
}

function setActive(next: boolean): void {
  active = next;
  try {
    if (next) window.localStorage.setItem(KEY, '1');
    else window.localStorage.removeItem(KEY);
  } catch { /* storage unavailable: keep the in-memory session */ }
  listeners.forEach(fn => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function startDevSession(): void { if (DEV_LOGIN) setActive(true); }
export function endDevSession(): void { if (getActive()) setActive(false); }

/** True while an "Entrar dev" session is active (always false in live mode and in production builds). */
export function useDevSession(): boolean {
  return useSyncExternalStore(subscribe, getActive, () => false);
}
