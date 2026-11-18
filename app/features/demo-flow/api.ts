import { useEffect } from 'react';
import { api, isProblem } from '~/lib/api/client';
import type { paths } from '~/lib/api/schema';
import { useSession } from '~/lib/session';
import { useApiData } from '~/features/portfolio/useApiData';

export const DEMO_IMAGES = [1, 2, 3, 4, 5].map(i => `/images/demo-flow/${i}.webp`);


export type DemoFlowState = paths['/v1/demo-flow']['get']['responses'][200]['content']['application/json'];
export type DemoRun = NonNullable<DemoFlowState['run']>;
export type DemoRunStatus = DemoRun['status'];

const ACTIVE: readonly DemoRunStatus[] = ['awaiting_payment', 'investing', 'distributing'];

/** Demo flow state; polls while the run is waiting on Binance or the chain. */
export function useDemoFlow() {
  const { status, user } = useSession();
  const data = useApiData<DemoFlowState>(status === 'authenticated' && user ? `${user.id}:demo-flow` : null, async () => (await api.GET('/v1/demo-flow')).data ?? null);
  const runStatus = data.data?.run?.status;
  const { reload } = data;
  useEffect(() => {
    if (!runStatus || !ACTIVE.includes(runStatus)) return;
    const id = setInterval(reload, runStatus === 'awaiting_payment' ? 3000 : 1500);
    return () => clearInterval(id);
  }, [runStatus, reload]);
  return data;
}

export type ActionResult = { ok: true } | { ok: false; message: string };

async function settle(p: Promise<{ data?: unknown; error?: unknown }>): Promise<ActionResult> {
  try {
    const r = await p;
    if (r.data) return { ok: true };
    const reason = isProblem(r.error) ? r.error.reason : undefined;
    if (reason === 'binance_failed') return { ok: false, message: 'Binance no respondió. Probá de nuevo o elegí otra opción.' };
    if (reason === 'demo_flow_busy') return { ok: false, message: 'Hay muchas demos esperando pago. Probá de nuevo en unos minutos.' };
    if (reason === 'demo_flow_unavailable') return { ok: false, message: 'La demo no está disponible en esta red.' };
    if (reason === 'demo_flow_state') return { ok: false, message: 'La demo ya avanzó a otro paso. Actualizamos la pantalla.' };
    if (isProblem(r.error) && r.error.status === 429) return { ok: false, message: 'Hiciste muchos intentos seguidos. Esperá unos minutos.' };
    return { ok: false, message: 'No se pudo completar la acción. Probá de nuevo.' };
  } catch {
    return { ok: false, message: 'No se pudo contactar al servidor. Revisá tu conexión.' };
  }
}

export type DemoPayout = paths['/v1/demo-flow/admin/payouts']['get']['responses'][200]['content']['application/json'][number];

/** Admin only: runs whose USDT still has to be sent back to the payer's Binance ID. */
export function usePendingPayouts(enabled: boolean) {
  const { user } = useSession();
  return useApiData<DemoPayout[]>(enabled && user ? `${user.id}:demo-flow:payouts` : null, async () => (await api.GET('/v1/demo-flow/admin/payouts')).data ?? null);
}

export type StartRunBody = paths['/v1/demo-flow/runs']['post']['requestBody']['content']['application/json'];
export const startRun = (body: StartRunBody) => settle(api.POST('/v1/demo-flow/runs', { body }));
export const loadProfit = (id: string) => settle(api.POST('/v1/demo-flow/runs/{id}/profit', { params: { path: { id } } }));
export const retryRun = (id: string) => settle(api.POST('/v1/demo-flow/runs/{id}/retry', { params: { path: { id } } }));
export const cancelRun = (id: string) => settle(api.POST('/v1/demo-flow/runs/{id}/cancel', { params: { path: { id } } }));
export async function markPayoutSent(id: string): Promise<ActionResult> {
  try {
    const r = await api.POST('/v1/demo-flow/admin/runs/{id}/payout', { params: { path: { id } } });
    return r.response.ok ? { ok: true } : { ok: false, message: 'No se pudo marcar la devolución.' };
  } catch {
    return { ok: false, message: 'No se pudo contactar al servidor.' };
  }
}

/** Progress counters derived from the run's recorded steps. */
export function progress(run: DemoRun | null | undefined) {
  const keys = new Set(run?.steps.map(s => s.key) ?? []);
  const count = (prefix: string) => [0, 1, 2, 3, 4].filter(i => keys.has(`${prefix}:${i}`)).length;
  const wallet = (i: number) =>
    keys.has(`sweep:${i}`) ? 'swept' : keys.has(`claim:${i}`) ? 'paid' : keys.has(`invest:${i}`) ? 'holding' : keys.has(`fund:${i}`) ? 'funded' : 'idle';
  return {
    funded: count('fund'),
    invested: count('invest'),
    claimed: count('claim'),
    swept: count('sweep'),
    deposit: run?.steps.find(s => s.key === 'deposit') ?? null,
    payout: run?.steps.find(s => s.key === 'payout') ?? null,
    wallet,
    step: (key: string) => run?.steps.find(s => s.key === key) ?? null,
  };
}
export type Progress = ReturnType<typeof progress>;
export type WalletState = ReturnType<Progress['wallet']>;
