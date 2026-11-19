import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';

/**
 * Base URL of the Brikme API (e.g. https://api.brikme.com). Empty = the
 * frontend runs standalone on its demo data, exactly as before the backend.
 */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
export const apiEnabled = API_URL.length > 0;

// Session token kept in memory only: a fallback for browsers that block the
// cross-site HttpOnly cookie. Never persisted (no localStorage), so XSS can't
// harvest it across reloads; the cookie remains the primary credential.
let bearer: string | null = null;
export function setBearer(token: string | null): void {
  bearer = token;
}

const auth: Middleware = {
  onRequest({ request }) {
    if (bearer) request.headers.set('authorization', `Bearer ${bearer}`);
    return request;
  },
};

/** Typed client generated from the API's OpenAPI document (npm run api:types). */
export const api = createClient<paths>({ baseUrl: API_URL, credentials: 'include' });
api.use(auth);

/** RFC 9457 problem returned by the API. */
export type ApiProblem = { title: string; status: number; code: string; [k: string]: unknown };

export function isProblem(v: unknown): v is ApiProblem {
  return typeof v === 'object' && v !== null && 'status' in v && 'code' in v && 'title' in v;
}

/** Headers for requests made outside the typed client (e.g. thirdweb's x402 fetch). */
export function authHeaders(): Record<string, string> {
  return bearer ? { authorization: `Bearer ${bearer}` } : {};
}

/** Absolute URL for endpoints called outside the typed client (e.g. x402 fetch). */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}
