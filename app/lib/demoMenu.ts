import { useCallback } from 'react';
import { HIDDEN_NAV_IDS } from '~/lib/hiddenSections';
import { useSession } from '~/lib/session';

/**
 * Accounts that see the trimmed navigation used for client demos: investor flow only
 * (dashboard, tokenizations, secondary market, holdings, academy, profile, help center).
 * It only hides menu entries; the routes themselves stay as they are.
 */
const MINIMAL_MENU_WALLETS: readonly string[] = ['0x57ecde5a9f1025dde4db9eaf5e32a1a485e14c59'];

const HIDDEN_IN_MINIMAL_MENU: ReadonlySet<string> = new Set(['admin', 'config', 'wizard']);

/**
 * Returns a filter for navigation items (sidebar, drawer, mobile bar): drops the globally hidden sections
 * (app/lib/hiddenSections.ts) and, for the demo accounts above, the trimmed menu.
 */
export function useMenuFilter(): <T extends { id: string }>(items: readonly T[]) => T[] {
  const { user } = useSession();
  const minimal = user !== null && MINIMAL_MENU_WALLETS.includes(user.walletAddress.toLowerCase());
  return useCallback(<T extends { id: string }>(items: readonly T[]) => items.filter(i => !HIDDEN_NAV_IDS.has(i.id) && !(minimal && HIDDEN_IN_MINIMAL_MENU.has(i.id))), [minimal]);
}
