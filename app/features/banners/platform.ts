import { useEffect, useSyncExternalStore } from 'react';
import { api, apiEnabled } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { isInternalPath } from '~/lib/links';

// Public platform data (settings and network description) fetched once per page
// load and shared by every component through a tiny external store.

export type PublicSettings = paths['/v1/settings/public']['get']['responses'][200]['content']['application/json'];
export type PlatformBanner = PublicSettings['banners'][number];
export type ChainInfo = paths['/v1/chain/info']['get']['responses'][200]['content']['application/json'];

type Resource<T> = {
  useValue: () => T | null;
  refresh: () => Promise<void>;
};

function createResource<T>(load: () => Promise<T | null>): Resource<T> {
  let value: T | null = null;
  let loaded = false;
  let inflight: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const subscribe = (onChange: () => void) => {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  };
  const getSnapshot = () => value;
  const getServerSnapshot = () => null;

  function fetchValue(force: boolean): Promise<void> {
    if (!apiEnabled) return Promise.resolve();
    if (inflight) return inflight;
    if (loaded && !force) return Promise.resolve();
    inflight = load()
      .then(next => {
        // A failed request keeps the last good value and is retried on the next mount.
        if (next === null) return;
        loaded = true;
        value = next;
        listeners.forEach(l => l());
      })
      .catch(() => undefined)
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  return {
    useValue() {
      const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      useEffect(() => {
        void fetchValue(false);
      }, []);
      return snapshot;
    },
    refresh: () => fetchValue(true),
  };
}

const settingsResource = createResource<PublicSettings>(async () => (await api.GET('/v1/settings/public')).data ?? null);
const chainInfoResource = createResource<ChainInfo>(async () => (await api.GET('/v1/chain/info')).data ?? null);

/** Public platform settings (banners, maintenance). Null in demo mode or while loading. */
export function usePublicSettings(): PublicSettings | null {
  return settingsResource.useValue();
}

/** Re-reads the public settings (e.g. after an admin saves the configuration). */
export function refreshPublicSettings(): Promise<void> {
  return settingsResource.refresh();
}

/** Network the platform operates on (chain id, USDC address, faucet). Null in demo mode or while loading. */
export function useChainInfo(): ChainInfo | null {
  return chainInfoResource.useValue();
}

/** Internal link (same-site path) or https URL; anything else is ignored. */
export function safeBannerHref(href: string | null | undefined): { kind: 'internal' | 'external'; href: string } | null {
  if (!href) return null;
  if (isInternalPath(href)) return { kind: 'internal', href };
  if (href.startsWith('https://')) return { kind: 'external', href };
  return null;
}
