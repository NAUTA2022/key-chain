import { useSyncExternalStore } from 'react';
import { useActiveAccount, useActiveWallet, useDisconnect } from 'thirdweb/react';

// Developer-only tooling ("Entrar dev" button, per-project state banner).
// Only enabled in `npm run dev` or when the build sets VITE_DEV_LOGIN=true —
// never in a normal production build.
export const DEV_MODE =
  import.meta.env.DEV || import.meta.env.VITE_DEV_LOGIN === 'true';

// "Entrar dev": a fake session that lets you get past every login gate
// without connecting a wallet through thirdweb, so the app can be tested
// anywhere (e.g. the cloud preview).
const KEY = 'kc_dev_session';
const DEV_ACCOUNT = { address: '0xDeDe00000000000000000000000000000000DeDe', isDev: true };
const listeners = new Set();

function readFlag() {
  if (!DEV_MODE) return false;
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

let active = readFlag();

function setActive(next) {
  active = next;
  try {
    if (next) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch { /* storage unavailable: keep the in-memory session */ }
  listeners.forEach(fn => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function startDevSession() { if (DEV_MODE) setActive(true); }
export function endDevSession() { setActive(false); }

// Drop-in for thirdweb's useActiveAccount(): the real wallet wins, otherwise
// the dev account while a dev session is active.
export function useSessionAccount() {
  const real = useActiveAccount();
  const dev = useSyncExternalStore(subscribe, () => active, () => false);
  return real || (dev ? DEV_ACCOUNT : undefined);
}

// Logout that ends the dev session as well as any connected wallet.
export function useSessionDisconnect() {
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  return () => {
    endDevSession();
    if (wallet) disconnect(wallet);
  };
}
