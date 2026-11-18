import { useCallback } from 'react';
import { useActiveAccount, useActiveWallet, useDisconnect } from 'thirdweb/react';
import type { Account } from 'thirdweb/wallets';
import { DEV_ACCOUNT, endDevSession, useDevSession, type DevAccount } from '~/lib/devLogin';

export { DEV_LOGIN, DEV_MODE, endDevSession, startDevSession, useDevSession, type DevAccount } from '~/lib/devLogin';

/**
 * Drop-in for thirdweb's useActiveAccount(): the real wallet wins, otherwise
 * the dev account while a dev session is active.
 */
export function useSessionAccount(): Account | DevAccount | undefined {
  const real = useActiveAccount();
  const dev = useDevSession();
  return real ?? (dev ? DEV_ACCOUNT : undefined);
}

/** Logout that ends the dev session as well as any connected wallet. */
export function useSessionDisconnect(): () => void {
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  return useCallback(() => {
    endDevSession();
    if (wallet) disconnect(wallet);
  }, [wallet, disconnect]);
}
