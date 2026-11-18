import { useCallback, useEffect, useState } from 'react';
import { api } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { apiErrorMessage } from './api';

export type AdminPool = paths['/v1/admin/pools']['get']['responses'][200]['content']['application/json'][number];
export type KycReview = paths['/v1/admin/kyc']['get']['responses'][200]['content']['application/json'][number];

/**
 * Admin reads with light polling while something is in flight on-chain
 * (pool deployments, identity onboarding), so the table updates by itself.
 */
export function useAdminData(enabled: boolean) {
  const [pools, setPools] = useState<AdminPool[]>([]);
  const [queue, setQueue] = useState<KycReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // After an admin action the result lands asynchronously (worker + chain): keep polling for a while.
  const [watchUntil, setWatchUntil] = useState(0);
  const reload = useCallback(() => setTick(t => t + 1), []);
  const reloadAndWatch = useCallback(() => {
    setWatchUntil(Date.now() + 120_000);
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void Promise.all([
      api.GET('/v1/admin/pools'),
      api.GET('/v1/admin/kyc', { params: { query: { status: 'pending' } } }),
      api.GET('/v1/admin/kyc', { params: { query: { status: 'verified' } } }),
      api.GET('/v1/admin/kyc', { params: { query: { status: 'rejected' } } }),
    ]).then(([p, pending, verified, rejected]) => {
      if (!alive) return;
      setPools(p.data ?? []);
      setQueue([...(pending.data ?? []), ...(verified.data ?? []), ...(rejected.data ?? [])]);
      const failed = [p, pending, verified, rejected].find(r => !r.response.ok);
      setError(failed ? apiErrorMessage(failed.error, 'No se pudieron cargar los pools y el KYC.') : null);
      setLoaded(true);
    }, () => {
      if (!alive) return;
      setError('No se pudo conectar con la API.');
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [enabled, tick]);

  const watching = watchUntil > 0;
  const busy = watching || pools.some(p => p.status === 'deploying' || p.status === 'granting_roles')
    || queue.some(k => k.onchainStatus !== null && k.onchainStatus !== 'verified' && k.onchainStatus !== 'failed');
  useEffect(() => {
    if (!enabled || !busy) return;
    const t = setInterval(() => {
      if (watchUntil > 0 && Date.now() > watchUntil) setWatchUntil(0);
      reload();
    }, 3000);
    return () => clearInterval(t);
  }, [enabled, busy, reload, watchUntil]);

  return { pools, queue, loaded, error, reload: reloadAndWatch };
}
