import { z } from 'zod';
import type { paths } from '~/lib/api/schema';

// Client mirror of key-chain-api/src/modules/tokenization/tokenization.schemas.ts
// (tokenizationRequestBody) with Spanish messages. Keep both in sync.

export type RequestBody = paths['/v1/tokenization-requests']['post']['requestBody']['content']['application/json'];
export type Category = RequestBody['category'];

export const CATEGORIES = ['autos', 'campos', 'drones', 'inmuebles', 'edificios', 'otro'] as const satisfies readonly Category[];

/** "Otro" needs a short description of what the asset is. */
export const OTHER_TYPE_MIN = 3;
export const OTHER_TYPE_MAX = 80;

export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 4000;
const PHONE_RE = /^[+\d][\d ()+.-]*$/;

/** Wizard answers exactly as typed: numbers stay text until they are validated. */
export type Draft = {
  category: Category | '';
  /** Only used (and sent) when the category is "otro". */
  otherType: string;
  assetName: string;
  country: string;
  location: string;
  lifespan: string;
  description: string;
  valuation: string;
  tokenPrice: string;
  totalTokens: string;
  expectedApy: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};
export type DraftField = keyof Draft;
export type FieldErrors = Partial<Record<DraftField, string>>;

const DRAFT_FIELDS: readonly DraftField[] = [
  'category', 'otherType', 'assetName', 'country', 'location', 'lifespan', 'description',
  'valuation', 'tokenPrice', 'totalTokens', 'expectedApy', 'contactName', 'contactEmail', 'contactPhone',
];

export function isDraftField(key: unknown): key is DraftField {
  return typeof key === 'string' && (DRAFT_FIELDS as readonly string[]).includes(key);
}

export function emptyDraft(contact: { name?: string | null; email?: string | null } = {}): Draft {
  return {
    category: '', otherType: '', assetName: '', country: '', location: '', lifespan: '', description: '',
    valuation: '', tokenPrice: '', totalTokens: '', expectedApy: '',
    contactName: contact.name ?? '', contactEmail: contact.email ?? '', contactPhone: '',
  };
}

/** Fields validated by each form step (the steps after "Contacto" have no inputs). */
export const STEP_FIELDS: ReadonlyArray<readonly DraftField[]> = [
  ['category', 'otherType'],
  ['assetName', 'country', 'location', 'lifespan', 'description'],
  ['valuation', 'tokenPrice', 'totalTokens', 'expectedApy'],
  ['contactName', 'contactEmail', 'contactPhone'],
];

/** Index of the first form step that holds one of the given fields (or -1). */
export function firstStepWith(errors: FieldErrors): number {
  return STEP_FIELDS.findIndex(fields => fields.some(f => errors[f]));
}

// ─── Numbers ─────────────────────────────────────────────────────────────────

/**
 * Parses an amount typed the way people write it in Argentina, plus plain numbers:
 * "1.500.000", "1500000", "1.500.000,50", "12,5", "12.5", "US$ 250.000", "8 %".
 * - Both "." and "," present: the last one is the decimal separator.
 * - Only ",": one comma is decimal ("12,5"); several are thousands ("1,500,000").
 * - Only ".": several dots are thousands; a single dot followed by exactly three digits
 *   after a 1–3 digit, non-zero integer part is thousands ("1.500" = 1500, es-AR);
 *   otherwise it is decimal ("12.5", "0.125").
 * Thousands groups must have three digits. Returns null when the text is not a number
 * (letters, signs, exponents…). The form shows the parsed value next to each field so
 * the interpretation is always visible before sending.
 */
export function parseAmount(raw: string): number | null {
  const s = raw
    .trim()
    .replace(/^(US\$|USD|\$)/i, '')
    .replace(/(%|USD)$/i, '')
    .replace(/\s/g, ''); // \s includes no-break spaces
  if (!s || !/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const dots = s.split('.').length - 1;
  const commas = s.split(',').length - 1;
  let decimal: '.' | ',' | null = null;
  let thousands: '.' | ',' | null = null;
  if (dots && commas) {
    decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    thousands = decimal === '.' ? ',' : '.';
  } else if (commas) {
    if (commas > 1) thousands = ',';
    else decimal = ',';
  } else if (dots) {
    if (dots > 1 || /^[1-9]\d{0,2}\.\d{3}$/.test(s)) thousands = '.';
    else decimal = '.';
  }

  let int = s;
  let frac = '';
  if (decimal) {
    const parts = s.split(decimal);
    if (parts.length !== 2 || !/^\d+$/.test(parts[1])) return null;
    [int, frac] = parts;
  }
  if (thousands) {
    const groups = int.split(thousands);
    if (!/^\d{1,3}$/.test(groups[0]) || groups.slice(1).some(g => !/^\d{3}$/.test(g))) return null;
    int = groups.join('');
  }
  if (!/^\d*$/.test(int) || (!int && !frac)) return null;
  const value = Number(`${int || '0'}.${frac || '0'}`);
  return Number.isFinite(value) ? value : null;
}

/** Decimal places of a parsed number ("1e-7" counts as too many). */
function decimals(n: number): number {
  const s = String(n);
  if (s.includes('e-')) return 99;
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const REQUIRED = 'Completa este campo.';

const amount = () =>
  z.number({ error: iss => (iss.input === undefined ? REQUIRED : 'Ingresa un número válido (por ejemplo 1.500.000 o 12,5).') });

const text = (min: number, max: number, empty = REQUIRED, short = `Usa al menos ${min} caracteres.`) => {
  const base = z.string().trim().min(1, empty);
  return (min > 1 ? base.min(min, short) : base).max(max, `Usa como máximo ${max} caracteres.`);
};

export const requestSchema = z.object({
  category: z.enum(CATEGORIES, { error: 'Elige el tipo de activo.' }),
  otherType: text(OTHER_TYPE_MIN, OTHER_TYPE_MAX, 'Cuéntanos qué tipo de activo es.').optional(),
  assetName: text(3, 120, 'Completa el nombre del activo.'),
  country: text(2, 60, 'Elige el país donde está el activo.'),
  location: text(2, 120, 'Completa la ubicación.'),
  lifespan: text(1, 60, 'Indica la duración estimada (por ejemplo, "5 años").'),
  description: text(DESCRIPTION_MIN, DESCRIPTION_MAX, 'Describe el activo.', `Cuenta un poco más: mínimo ${DESCRIPTION_MIN} caracteres.`),
  valuation: amount()
    .positive('La valuación tiene que ser mayor a 0.')
    .max(1e14, 'La valuación supera el máximo permitido.')
    .refine(n => decimals(n) <= 2, 'Usa como máximo 2 decimales.'),
  tokenPrice: amount()
    .positive('El precio tiene que ser mayor a 0.')
    .max(1e9, 'El precio por token no puede superar US$ 1.000.000.000.')
    .refine(n => decimals(n) <= 6, 'Usa como máximo 6 decimales.'),
  totalTokens: amount()
    .int('Tiene que ser un número entero, sin decimales.')
    .min(1, 'Emite al menos 1 token.')
    .max(100_000_000, 'El máximo es 100.000.000 de tokens.'),
  expectedApy: amount()
    .min(0, 'El rendimiento no puede ser negativo.')
    .max(100, 'El rendimiento no puede superar el 100 %.'),
  contactName: text(2, 120, 'Completa tu nombre.'),
  contactEmail: z.email({ error: 'Ingresa un email válido.' }).max(200, 'Usa como máximo 200 caracteres.'),
  contactPhone: z
    .string()
    .trim()
    .min(6, 'El teléfono tiene que tener al menos 6 caracteres.')
    .max(30, 'Usa como máximo 30 caracteres.')
    .regex(PHONE_RE, 'Usa solo números, espacios y los signos + ( ) . -')
    .optional(),
});

/** Converts the typed answers into the API shape (still unvalidated). */
function toCandidate(d: Draft): Record<string, unknown> {
  const num = (s: string) => (s.trim() === '' ? undefined : (parseAmount(s) ?? Number.NaN));
  return {
    category: d.category || undefined,
    // Sent only for "otro" (the API rejects it for the other categories).
    otherType: d.category === 'otro' ? d.otherType.trim() : undefined,
    assetName: d.assetName.trim(),
    country: d.country.trim(),
    location: d.location.trim(),
    lifespan: d.lifespan.trim(),
    description: d.description.trim(),
    valuation: num(d.valuation),
    tokenPrice: num(d.tokenPrice),
    totalTokens: num(d.totalTokens),
    expectedApy: num(d.expectedApy),
    contactName: d.contactName.trim(),
    contactEmail: d.contactEmail.trim(),
    contactPhone: d.contactPhone.trim() || undefined,
  };
}

/** Validates the whole draft: the request body, or the first error of each field. */
export function parseDraft(d: Draft): { ok: true; body: RequestBody } | { ok: false; errors: FieldErrors } {
  const result = requestSchema.safeParse(toCandidate(d));
  // Checked by hand so the error shows up on the first step even while later steps are empty.
  const otherMissing = d.category === 'otro' && !d.otherType.trim();
  if (result.success && !otherMissing) {
    const { contactPhone, otherType, ...rest } = result.data;
    return { ok: true, body: { ...rest, ...(otherType ? { otherType } : {}), ...(contactPhone ? { contactPhone } : {}) } };
  }
  const errors: FieldErrors = {};
  if (otherMissing) errors.otherType = 'Cuéntanos qué tipo de activo es.';
  for (const issue of result.success ? [] : result.error.issues) {
    const key = issue.path[0];
    if (isDraftField(key) && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** Errors of the given fields only (used to validate one step before advancing). */
export function validateFields(d: Draft, fields: readonly DraftField[]): FieldErrors {
  const parsed = parseDraft(d);
  if (parsed.ok) return {};
  const errors: FieldErrors = {};
  for (const f of fields) if (parsed.errors[f]) errors[f] = parsed.errors[f];
  return errors;
}
