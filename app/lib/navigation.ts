import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ACADEMY_POSTS } from '~/data';

/**
 * Logical page keys used across the UI (`nav('detalle', asset)`).
 * Each key maps to a real, shareable URL so every screen is deep-linkable,
 * indexable when public, and works with the browser's back/forward buttons.
 */
export type RouteKey =
  | 'landing' | 'login'
  | 'feed' | 'empresa' | 'usuario'
  | 'dashboard' | 'primario' | 'secundario' | 'detalle' | 'checkout' | 'token'
  | 'pertenencias' | 'ecosistema' | 'inquilino' | 'academia' | 'articulo'
  | 'perfil' | 'ayuda' | 'admin' | 'config' | 'wizard' | 'swap' | 'keypay'
  | 'bookey' | 'keydrive' | 'keyjobs' | 'keyrural' | 'escrow' | 'tracker';

export const PATHS = {
  landing: '/',
  login: '/ingresar',
  feed: '/feed',
  dashboard: '/panel',
  primario: '/tokenizaciones',
  secundario: '/mercado-secundario',
  checkout: '/checkout',
  token: '/token',
  pertenencias: '/pertenencias',
  ecosistema: '/ecosistema',
  inquilino: '/inquilino',
  academia: '/academia',
  perfil: '/perfil',
  ayuda: '/ayuda',
  admin: '/admin',
  config: '/configuracion',
  wizard: '/tokenizar',
  swap: '/swap',
  keypay: '/keypay',
  bookey: '/bookey',
  keydrive: '/key-drive',
  keyjobs: '/key-jobs',
  keyrural: '/key-rural',
  escrow: '/escrow-chain',
  tracker: '/tracker-gps',
} as const satisfies Record<Exclude<RouteKey, 'detalle' | 'articulo' | 'empresa' | 'usuario'>, string>;

/** Page a user lands on after signing in (and the logo / "home" target inside the app). */
export const HOME_PATH = PATHS.feed;

/** Public profile URLs: `/empresas/<slug>` (companies) and `/usuarios/<slug>` (people). */
export const COMPANY_BASE = '/empresas';
export const USER_BASE = '/usuarios';

/**
 * URL slug for a company or person name ("Agro Pampa S.A." → "agro-pampa-s-a").
 * Idempotent: a value that already is a slug comes back unchanged, so call
 * sites may pass either the display name or the API slug.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type Identified = { id: number | string };
type PostRef = { slug: string };
type CheckoutRef = { asset?: Identified; id?: number | string; qty?: number; orden?: string };
type CartRef = 'cart' | { screen?: 'cart'; focusId?: number | string | null } | null | undefined;
/** Company / person: its slug or display name (`nav('empresa', 'Agro Pampa')`), or an object carrying either. */
type ProfileRef = string | { slug: string } | { name: string };

export type NavPayload = Identified | PostRef | CheckoutRef | CartRef | ProfileRef | Record<string, unknown> | null | undefined;
export type NavFn = (key: RouteKey, data?: NavPayload) => void;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function profileSlugOf(v: unknown): string | null {
  const raw = typeof v === 'string' ? v
    : isRecord(v) && typeof v.slug === 'string' ? v.slug
    : isRecord(v) && typeof v.name === 'string' ? v.name
    : null;
  const slug = raw ? slugify(raw) : '';
  return slug || null;
}

function idOf(v: unknown): string | null {
  if (isRecord(v) && (typeof v.id === 'number' || typeof v.id === 'string')) return String(v.id);
  return null;
}

/** Builds the URL for a logical page key plus its optional payload. */
export function pathFor(key: RouteKey, payload?: NavPayload): string {
  // Payloads come from untyped call sites; narrow them structurally.
  const data: unknown = payload;
  switch (key) {
    case 'detalle': {
      const id = idOf(data);
      if (!id) return PATHS.primario;
      // A post deep link (feed/company cards) opens the project's Feed tab at that post.
      const post = isRecord(data) && (typeof data.focusPostId === 'string' || typeof data.focusPostId === 'number') ? String(data.focusPostId) : null;
      return `/tokenizaciones/${encodeURIComponent(id)}${post ? `?publicacion=${encodeURIComponent(post)}` : ''}`;
    }
    case 'empresa': {
      const slug = profileSlugOf(data);
      return slug ? `${COMPANY_BASE}/${encodeURIComponent(slug)}` : PATHS.feed;
    }
    case 'usuario': {
      const slug = profileSlugOf(data);
      return slug ? `${USER_BASE}/${encodeURIComponent(slug)}` : PATHS.perfil;
    }
    case 'articulo': {
      const slug = isRecord(data) && typeof data.slug === 'string' ? data.slug : ACADEMY_POSTS[0]?.slug;
      return slug ? `/academia/${slug}` : PATHS.academia;
    }
    case 'checkout': {
      // `orden`: an order kept by goCheckout (app/lib/checkout.ts); `activo` + `cantidad`: an investment link.
      const params = new URLSearchParams();
      if (isRecord(data) && typeof data.orden === 'string' && data.orden) params.set('orden', data.orden);
      const id = isRecord(data) ? idOf(data.asset) ?? idOf(data) : null;
      if (id) params.set('activo', id);
      if (isRecord(data) && typeof data.qty === 'number' && data.qty > 0) params.set('cantidad', String(data.qty));
      const qs = params.toString();
      return qs ? `${PATHS.checkout}?${qs}` : PATHS.checkout;
    }
    case 'inquilino': {
      const id = idOf(data);
      return id ? `${PATHS.inquilino}?activo=${encodeURIComponent(id)}` : PATHS.inquilino;
    }
    case 'keypay': {
      const wantsCart = data === 'cart' || (isRecord(data) && data.screen === 'cart');
      if (!wantsCart) return PATHS.keypay;
      const params = new URLSearchParams({ pantalla: 'carrito' });
      const focus = isRecord(data) ? data.focusId : null;
      if (typeof focus === 'number' || typeof focus === 'string') params.set('pago', String(focus));
      return `${PATHS.keypay}?${params.toString()}`;
    }
    default:
      return PATHS[key];
  }
}

const PATH_TO_KEY: ReadonlyArray<readonly [RegExp, RouteKey]> = [
  [/^\/$/, 'landing'],
  [/^\/ingresar\/?$/, 'login'],
  [/^\/tokenizaciones\/[^/]+\/?$/, 'detalle'],
  [/^\/academia\/[^/]+\/?$/, 'articulo'],
  [/^\/empresas\/[^/]+\/?$/, 'empresa'],
  [/^\/usuarios\/[^/]+\/?$/, 'usuario'],
  ...(Object.entries(PATHS) as Array<[RouteKey, string]>)
    .filter(([, p]) => p !== '/')
    .map(([k, p]) => [new RegExp(`^${p}(?:/.*)?$`), k] as const),
];

/** Resolves the logical page key for a pathname (used for active nav state). */
export function routeKeyFromPath(pathname: string): RouteKey | null {
  for (const [rx, key] of PATH_TO_KEY) if (rx.test(pathname)) return key;
  return null;
}

export type NavState = { from?: RouteKey | null };

/** Router-backed replacement for the old in-memory `nav(page, data)` state machine. */
export function useNav(): NavFn {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback<NavFn>((key, data) => {
    const state: NavState = { from: routeKeyFromPath(pathname) };
    navigate(pathFor(key, data), { state });
  }, [navigate, pathname]);
}
