import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** False during prerender and the hydration pass, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
