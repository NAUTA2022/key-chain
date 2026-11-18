import { z } from 'zod';
import { PATHS, type NavFn, type NavPayload, type RouteKey } from '~/lib/navigation';

// Every "buy / invest / pay" CTA in the platform opens KEYCHAIN's own
// checkout through this helper.
//
// The order travels in memory and in sessionStorage under a short id that
// goes in the URL (`/checkout?orden=<id>`), so a reload keeps it. Investments
// in a primary offering also carry `?activo=<id>&cantidad=<n>`: the plain
// link form keeps working without the stored order (new tab, shared link).

export type CheckoutItem = { name: string; img?: string; qty: number; unit: number; meta?: string };
export type CheckoutTarget = { route: RouteKey; data?: NavPayload; label?: string };
export type CheckoutAction =
  | { kind: 'primary'; assetId: number; quantity: number }
  | { kind: 'secondary'; listingId: string; quantity: number };
export type CheckoutOrder = {
  /** What's being paid ("Inversión", "Alquiler"…). */
  title: string;
  items: CheckoutItem[];
  /** Platform fee in USD (already quoted to the user). Live on-chain purchases include it in the price: pass 0. */
  fee?: number;
  /** "Tokenizaciones", "Mercado Secundario"… */
  source: string;
  /** Where "continue" goes after paying. */
  done?: CheckoutTarget;
  /** Where "Volver" goes. */
  back?: CheckoutTarget;
  /** live mode: what gets executed */
  action?: CheckoutAction;
};

export function orderTotals(order: CheckoutOrder): { subtotal: number; fee: number; total: number } {
  const subtotal = (order.items || []).reduce((s, it) => s + it.qty * it.unit, 0);
  const fee = order.fee || 0;
  return { subtotal, fee, total: subtotal + fee };
}

export function goCheckout(nav: NavFn, order: CheckoutOrder): void {
  const orden = saveOrder(order);
  const link = order.action?.kind === 'primary' ? { id: order.action.assetId, qty: order.action.quantity } : {};
  nav('checkout', { orden, ...link });
}

/** Asset fields the checkout needs for an investment opened from a plain link. */
export type CheckoutAsset = { id: number; name: string; img: string; tokenPrice: number; apy: number; cat: string };

/**
 * The investment order behind `/checkout?activo=<id>&cantidad=<n>`. Demo: the
 * design's 0.5% fee on top. Live: the API prices it (the fee is inside the
 * token price), so no fee is added.
 */
export function investmentOrder(a: CheckoutAsset, qty: number, live: boolean): CheckoutOrder {
  return {
    title: 'Inversión', source: 'Tokenizaciones', fee: live ? 0 : qty * a.tokenPrice * 0.005,
    items: [{ name: a.name, img: a.img, qty, unit: a.tokenPrice, meta: `${a.apy}% APY · ${a.cat}` }],
    back: { route: 'detalle', data: { id: a.id } }, done: { route: 'pertenencias', label: 'Ver en Mis Pertenencias' },
    action: { kind: 'primary', assetId: a.id, quantity: qty },
  };
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const PREFIX = 'kc:checkout:';
const KEEP = 8;
const memory = new Map<string, CheckoutOrder>();
let seq = 0;

const ROUTE_KEYS: ReadonlySet<string> = new Set<string>([...Object.keys(PATHS), 'detalle', 'articulo', 'empresa', 'usuario']);
const isRouteKey = (v: unknown): v is RouteKey => typeof v === 'string' && ROUTE_KEYS.has(v);

/** What a navigation target needs to build its URL (ids, slugs, names), small enough to store. */
type StoredPayload = string | Record<string, string | number>;
const REF_KEYS = ['id', 'slug', 'name', 'screen', 'focusId'] as const;

function refOf(data: NavPayload): StoredPayload | undefined {
  if (typeof data === 'string') return data;
  if (typeof data !== 'object' || data === null) return undefined;
  const src: Record<string, unknown> = { ...data };
  const out: Record<string, string | number> = {};
  for (const k of REF_KEYS) {
    const v = src[k];
    if (typeof v === 'string' || typeof v === 'number') out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

const targetOf = (t: CheckoutTarget | undefined): CheckoutTarget | undefined =>
  t && { route: t.route, ...(t.data !== undefined ? { data: refOf(t.data) } : {}), ...(t.label !== undefined ? { label: t.label } : {}) };

const payloadSchema = z.union([z.string(), z.record(z.string(), z.union([z.string(), z.number()]))]);
const targetSchema = z.object({ route: z.custom<RouteKey>(isRouteKey), data: payloadSchema.optional(), label: z.string().optional() });
const orderSchema = z.object({
  title: z.string(),
  items: z.array(z.object({ name: z.string(), img: z.string().optional(), qty: z.number().finite(), unit: z.number().finite(), meta: z.string().optional() })),
  fee: z.number().finite().optional(),
  source: z.string(),
  done: targetSchema.optional(),
  back: targetSchema.optional(),
  action: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('primary'), assetId: z.number().int().positive(), quantity: z.number().int().positive() }),
    z.object({ kind: z.literal('secondary'), listingId: z.string().min(1), quantity: z.number().int().positive() }),
  ]).optional(),
});

function newId(): string {
  seq += 1;
  return `${Date.now().toString(36)}${seq.toString(36)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`;
}

function prune(): void {
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  // Ids start with the creation time in base 36, so they sort by age.
  keys.sort().slice(0, Math.max(0, keys.length - KEEP)).forEach(k => sessionStorage.removeItem(k));
}

/** Keeps an order for the checkout page; returns its id. */
export function saveOrder(order: CheckoutOrder): string {
  const id = newId();
  const stored: CheckoutOrder = { ...order, done: targetOf(order.done), back: targetOf(order.back) };
  memory.set(id, stored);
  try {
    sessionStorage.setItem(PREFIX + id, JSON.stringify(stored));
    prune();
  } catch {
    // Storage unavailable (private mode, quota): the in-memory copy still serves this visit.
  }
  return id;
}

/** The order saved under `id` (same object on every call), or null when unknown or invalid. */
export function loadOrder(id: string | null | undefined): CheckoutOrder | null {
  if (!id) return null;
  const hit = memory.get(id);
  if (hit) return hit;
  try {
    const raw = sessionStorage.getItem(PREFIX + id);
    if (!raw) return null;
    const parsed = orderSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    memory.set(id, parsed.data);
    return parsed.data;
  } catch {
    return null;
  }
}
