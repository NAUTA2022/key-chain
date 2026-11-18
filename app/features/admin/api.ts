import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { apiUrl, authHeaders, isProblem } from '~/lib/api/client';
import { mediaUrl } from '~/lib/catalog';
import { problemMessage } from '~/lib/onchain';

// Data plumbing for the admin panel: typed-client unwrapping, multipart uploads,
// authenticated downloads and small fetch hooks with reload.

/** Error whose message is ready to show in the UI (Spanish or the API's own title). */
export class AdminError extends Error {}

const GENERIC: Partial<Record<number, string>> = {
  401: 'Tu sesión expiró: volvé a conectar la wallet.',
  403: 'No tenés permisos para esta acción.',
  413: 'El archivo supera el tamaño permitido.',
  429: 'Demasiadas solicitudes: probá de nuevo en unos segundos.',
};

/** Message for an RFC 9457 problem, including field issues of a 422. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!isProblem(error)) return fallback;
  const generic = GENERIC[error.status];
  if (generic) return generic;
  const base = problemMessage(error, fallback);
  const issues: unknown = error.issues;
  if (!Array.isArray(issues)) return base;
  const details = (issues as unknown[]).flatMap(i => {
    if (typeof i !== 'object' || i === null || !('message' in i) || typeof i.message !== 'string') return [];
    const path = 'path' in i && typeof i.path === 'string' && i.path ? `${i.path}: ` : '';
    return [`${path}${i.message}`];
  });
  return details.length ? `${base} (${details.join('; ')})` : base;
}

export function errorText(e: unknown, fallback = 'No se pudo completar la operación.'): string {
  return e instanceof AdminError ? e.message : fallback;
}

type ApiResult<T> = { data?: T; error?: unknown; response: Response };

/** Awaits a typed-client call and returns its data, or throws an AdminError with the API message. */
export async function unwrap<T>(call: Promise<ApiResult<T>>, fallback = 'No se pudo cargar la información.'): Promise<T> {
  let res: ApiResult<T>;
  try {
    res = await call;
  } catch {
    throw new AdminError('No se pudo conectar con la API.');
  }
  if (!res.response.ok || res.data === undefined) throw new AdminError(apiErrorMessage(res.error, fallback));
  return res.data;
}

/** Same as unwrap for calls without a JSON body (202/204). */
export async function ensureOk(call: Promise<{ error?: unknown; response: Response }>, fallback = 'No se pudo completar la operación.'): Promise<void> {
  let res: { error?: unknown; response: Response };
  try {
    res = await call;
  } catch {
    throw new AdminError('No se pudo conectar con la API.');
  }
  if (!res.response.ok) throw new AdminError(apiErrorMessage(res.error, fallback));
}

/** Multipart upload (the typed client does not build FormData bodies). */
export async function postForm(path: string, form: FormData, fallback = 'No se pudo subir el archivo.'): Promise<void> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), { method: 'POST', body: form, credentials: 'include', headers: authHeaders() });
  } catch {
    throw new AdminError('No se pudo conectar con la API.');
  }
  if (res.ok) return;
  const body: unknown = await res.json().catch(() => null);
  throw new AdminError(apiErrorMessage(body, fallback));
}

/** Downloads a stored file: private API files need the session, so they go through fetch + blob. */
export async function downloadFile(url: string, filename: string): Promise<void> {
  // Session credentials only ever go to the API's own file endpoint.
  if (!/^\/v1\/files\/[\w-]+$/.test(url)) {
    // Anything else opens without credentials, and only http(s) or same-site paths.
    if (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
    else throw new AdminError('Enlace de archivo no válido.');
    return;
  }
  let res: Response;
  try {
    res = await fetch(mediaUrl(url), { credentials: 'include', headers: authHeaders() });
  } catch {
    throw new AdminError('No se pudo conectar con la API.');
  }
  if (!res.ok) throw new AdminError('No se pudo descargar el archivo.');
  const href = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30_000);
}

// GET /v1/chain/status is not described in the OpenAPI document: validate its shape here.
const chainStatusSchema = z.object({
  chainId: z.number(),
  network: z.string(),
  blockNumber: z.number(),
  contracts: z.record(z.string(), z.string().nullable()),
  timelockMinDelaySeconds: z.number(),
  defaultFeesBps: z.object({ issuance: z.number(), yield: z.number() }),
  engine: z.object({
    address: z.string(),
    isOperator: z.boolean(),
    isIdentityAgent: z.boolean(),
    membershipTier: z.string(),
    poolsDeployed: z.number(),
    balancePol: z.string(),
  }),
  signer: z.object({ configured: z.boolean(), address: z.string().nullable(), isEngine: z.boolean(), isTimelockProposer: z.boolean() }),
  claimSigner: z.object({ address: z.string().nullable(), authorized: z.boolean() }),
  faucetEnabled: z.boolean(),
});
export type ChainStatus = z.infer<typeof chainStatusSchema>;

export async function fetchChainStatus(): Promise<ChainStatus> {
  let res: Response;
  try {
    res = await fetch(apiUrl('/v1/chain/status'), { credentials: 'include', headers: authHeaders() });
  } catch {
    throw new AdminError('No se pudo conectar con la API.');
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new AdminError(apiErrorMessage(body, 'No se pudo leer el estado de la red.'));
  const parsed = chainStatusSchema.safeParse(body);
  if (!parsed.success) throw new AdminError('La API devolvió un estado de red inesperado.');
  return parsed.data;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

type Loaded<T> = { key: string; tick: number; data: T | null; error: string | null };

/**
 * Loads `load()` whenever `key` changes (null = disabled) or `reload()` is called.
 * Data of the same key stays visible while it reloads; with `keepPrevious` (lists
 * whose filters change) the previous key's data also stays until the new one lands.
 */
export function useApiData<T>(key: string | null, load: () => Promise<T>, opts?: { keepPrevious?: boolean }) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<Loaded<T> | null>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    if (key === null) return;
    let alive = true;
    loadRef.current().then(
      data => {
        if (alive) setState({ key, tick, data, error: null });
      },
      (e: unknown) => {
        if (alive) setState(prev => ({ key, tick, data: prev?.key === key ? prev.data : null, error: errorText(e, 'No se pudo cargar la información.') }));
      },
    );
    return () => {
      alive = false;
    };
  }, [key, tick]);
  const reload = useCallback(() => setTick(t => t + 1), []);
  const same = key !== null && state?.key === key ? state : null;
  const previous = opts?.keepPrevious && key !== null ? (state?.data ?? null) : null;
  return {
    data: same ? same.data : previous,
    error: same?.error ?? null,
    loading: key !== null && (same === null || same.tick !== tick),
    /** Identifies the loaded snapshot (changes on every completed load). */
    stamp: same ? `${same.key}#${same.tick}` : null,
    reload,
  };
}

export type Page<T> = { items: T[]; nextCursor: string | null };

/** Cursor pagination on top of useApiData: "Cargar más" appends pages; `replace` patches one row. */
export function usePaged<T extends { id: string }>(key: string | null, fetchPage: (cursor: string | undefined) => Promise<Page<T>>) {
  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });
  const first = useApiData(key, () => fetchRef.current(undefined), { keepPrevious: true });
  const [extra, setExtra] = useState<{ stamp: string; items: T[]; nextCursor: string | null } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, T>>({});
  const [more, setMore] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });

  const ext = extra && extra.stamp === first.stamp ? extra : null;
  const seen = new Set<string>();
  const items: T[] = [];
  for (const item of [...(first.data?.items ?? []), ...(ext?.items ?? [])]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(overrides[item.id] ?? item);
  }
  const nextCursor = ext ? ext.nextCursor : (first.data?.nextCursor ?? null);

  async function loadMore() {
    const stamp = first.stamp;
    if (!nextCursor || !stamp) return;
    setMore({ busy: true, error: null });
    try {
      const page = await fetchRef.current(nextCursor);
      setExtra(prev => ({ stamp, items: [...(prev?.stamp === stamp ? prev.items : []), ...page.items], nextCursor: page.nextCursor }));
      setMore({ busy: false, error: null });
    } catch (e) {
      setMore({ busy: false, error: errorText(e, 'No se pudo cargar la página siguiente.') });
    }
  }
  const replace = useCallback((item: T) => setOverrides(o => ({ ...o, [item.id]: item })), []);

  return {
    items,
    loading: first.loading,
    loaded: first.stamp !== null,
    error: first.error,
    hasMore: nextCursor !== null,
    loadMore,
    loadingMore: more.busy,
    moreError: more.error,
    reload: first.reload,
    replace,
  };
}

/** `value` after it stopped changing for `ms` (search boxes). */
export function useDebounced<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Calls `fn` every `ms` while `active` (e.g. on-chain work in flight). */
export function usePolling(fn: () => void, ms: number, active: boolean): void {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => fnRef.current(), ms);
    return () => clearInterval(t);
  }, [ms, active]);
}
