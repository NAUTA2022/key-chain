import { useCallback, useEffect, useState } from 'react';
import { API_URL, apiUrl, authHeaders, isProblem } from '~/lib/api/client';

// Small data/IO helpers shared by the live account pages (profile, support,
// tokenization, academy). No components here, so React Refresh stays happy.

/** Result of an API call that never throws (network errors become `error`). */
export type ApiResult<T> = { data: T | null; error: unknown };

/** Wraps an openapi-fetch call: resolves to { data, error } even on network failures. */
export async function call<T>(request: Promise<{ data?: T; error?: unknown }>): Promise<ApiResult<T>> {
  try {
    const r = await request;
    return { data: r.data ?? null, error: r.data === undefined ? (r.error ?? 'unknown') : null };
  } catch (e) {
    return { data: null, error: e };
  }
}

/**
 * Fetch-on-mount for authenticated reads. `key` identifies the resource (null = disabled);
 * changing it refetches. Previous data stays visible while a reload is in flight.
 */
export function useApi<T>(key: string | null, load: () => Promise<ApiResult<T>>) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ key: string; tick: number; data: T | null; error: unknown } | null>(null);
  useEffect(() => {
    if (key === null) return;
    let alive = true;
    load()
      .then(r => alive && setState({ key, tick, data: r.data, error: r.error }))
      .catch((e: unknown) => alive && setState({ key, tick, data: null, error: e }));
    return () => {
      alive = false;
    };
    // `load` is recreated every render; `key` + `tick` decide when to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  const fresh = key !== null && state !== null && state.key === key;
  const reload = useCallback(() => setTick(t => t + 1), []);
  /** Replaces the cached data (e.g. with the response of a write). */
  const mutate = useCallback((data: T) => setState(s => (s ? { ...s, data, error: null } : s)), []);
  return {
    data: fresh ? state.data : null,
    error: fresh ? state.error : null,
    loading: key !== null && (!fresh || state.tick !== tick),
    reload,
    mutate,
  };
}

const CODE_MESSAGES: Record<string, string> = {
  rate_limited: 'Demasiados intentos seguidos. Esperá unos minutos y volvé a probar.',
  payload_too_large: 'El archivo es demasiado grande.',
  unauthorized: 'Tu sesión expiró. Volvé a conectar tu wallet.',
  forbidden: 'No tenés permiso para hacer esto.',
  service_unavailable: 'El servicio no está disponible en este momento. Probá más tarde.',
};

/**
 * Spanish message for an API problem (RFC 9457). `reasons` maps the problem's `reason`
 * (or `code`) to custom copy; the API's own titles are English, so they are never shown.
 */
export function errorText(error: unknown, fallback: string, reasons: Record<string, string> = {}): string {
  if (!isProblem(error)) return error instanceof TypeError ? 'No pudimos conectar con el servidor. Revisá tu conexión.' : fallback;
  const reason = typeof error.reason === 'string' ? error.reason : null;
  if (reason && reasons[reason]) return reasons[reason];
  if (reasons[error.code]) return reasons[error.code];
  return CODE_MESSAGES[error.code] ?? fallback;
}

/** Problem `reason` (e.g. "email_unavailable"), when present. */
export function problemReason(error: unknown): string | null {
  return isProblem(error) && typeof error.reason === 'string' ? error.reason : null;
}

// ─── Files ───────────────────────────────────────────────────────────────────

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const DOC_TYPES = [...IMAGE_TYPES, 'application/pdf'] as const;
export const MB = 1024 * 1024;

/** Client-side check before uploading; returns the Spanish error or null when the file is OK. */
export function checkFile(file: File, rules: { types: readonly string[]; maxBytes: number }): string | null {
  if (!rules.types.includes(file.type)) {
    return rules.types.includes('application/pdf') ? 'Formato no admitido. Usá PDF, PNG, JPG o WebP.' : 'Formato no admitido. Usá PNG, JPG o WebP.';
  }
  if (file.size > rules.maxBytes) return `El archivo supera el máximo de ${Math.round(rules.maxBytes / MB)} MB.`;
  if (file.size === 0) return 'El archivo está vacío.';
  return null;
}

/** Multipart upload (field "file") to an API path; parses problem+json errors. */
export async function uploadFile<T>(path: string, file: File, method: 'POST' | 'PUT' = 'POST'): Promise<ApiResult<T>> {
  // Credentials only ever go to the API itself: relative /v1/ paths, no scheme/host tricks.
  if (!/^\/v1\/[A-Za-z0-9/_-]+$/.test(path)) return { data: null, error: new Error('Invalid API path') };
  const body = new FormData();
  body.append('file', file);
  try {
    const res = await fetch(apiUrl(path), { method, body, credentials: 'include', headers: authHeaders() });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) return { data: null, error: json ?? { title: res.statusText, status: res.status, code: 'internal_error' } };
    return { data: json as T, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

/** Triggers a browser download for a Blob. */
export function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** API file endpoint (`/v1/files/<uuid>`): the only place credentials are ever sent for downloads. */
const API_FILE_PATH = /^\/v1\/files\/[0-9a-f-]{36}$/i;

/**
 * Downloads a private file served by the API (`/v1/files/<uuid>`) with the session
 * credentials, so it also works when only the bearer fallback is available. Anything
 * else is never fetched with credentials: an external http(s) link opens in a new tab
 * without them, and any other value is rejected (returns false).
 */
export async function downloadAuthed(url: string, filename: string): Promise<boolean> {
  if (!API_FILE_PATH.test(url)) {
    if (/^https?:\/\//i.test(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }
    return false;
  }
  try {
    const res = await fetch(`${API_URL}${url}`, { credentials: 'include', headers: authHeaders() });
    if (!res.ok) return false;
    saveBlob(await res.blob(), filename);
    return true;
  } catch {
    return false;
  }
}

/** Escapes one CSV cell (RFC 4180) and neutralises spreadsheet formulas. */
export function csvCell(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>): string {
  return rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR', opts);
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** "Hoy, 09:32" / "Hace 3 días" / "12 may 2026", relative to `now` (pass Date.now() from an effect or event). */
export function fmtRelative(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const days = Math.floor((now - t) / 86_400_000);
  const time = new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (days <= 0 && new Date(t).toDateString() === new Date(now).toDateString()) return `Hoy, ${time}`;
  if (days <= 1) return `Ayer, ${time}`;
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} semana${days >= 14 ? 's' : ''}`;
  return fmtDate(iso);
}

/** Human file size: "820 KB", "3.4 MB". */
export function fmtSize(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Splits plain text into paragraphs on blank lines (API text is never rendered as HTML). */
export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? '').split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean);
}
