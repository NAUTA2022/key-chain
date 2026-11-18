import { useCallback, useEffect, useEffectEvent, useState } from 'react';

export type ApiData<T> = {
  data: T | null;
  /** True until the request for the current key (and reload) settles. */
  loading: boolean;
  /** The last request for the current key failed or returned nothing. */
  failed: boolean;
  reload: () => void;
};

/**
 * Fetch-on-mount for API reads. `key` identifies the request (null = disabled):
 * a new key refetches and `reload()` refetches the same key, keeping the data
 * already shown until the new response arrives.
 */
export function useApiData<T>(key: string | null, load: () => Promise<T | null>): ApiData<T> {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<{ key: string; tick: number; data: T | null } | null>(null);
  const run = useEffectEvent(load);

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    run()
      .then(data => {
        if (alive) setResult({ key, tick, data });
      })
      .catch(() => {
        if (alive) setResult({ key, tick, data: null });
      });
    return () => {
      alive = false;
    };
  }, [key, tick]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  const current = key !== null && result?.key === key ? result : null;
  const settled = current !== null && current.tick === tick;
  return {
    data: current?.data ?? null,
    loading: key !== null && !settled,
    failed: settled && current.data === null,
    reload,
  };
}
