import type { AssetCategory } from '~/data';
import { fmtUSD2 } from '~/data';
import type { Translator } from '~/i18n/useT';

// Formatting helpers for live (API) data. Dates default to the platform's Spanish
// locale; screens pass the active language's locale (`useT(ns).locale`).

const LOCALE = 'es-AR';

/** True for a YYYY-MM-DD date (no time): formatted in UTC so it never shifts a day. */
const isDateOnly = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function toDate(value: string | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function format(value: string | Date, opts: Intl.DateTimeFormatOptions, locale: string): string {
  const d = toDate(value);
  if (!d) return '—';
  const utc = typeof value === 'string' && isDateOnly(value);
  return new Intl.DateTimeFormat(locale, utc ? { ...opts, timeZone: 'UTC' } : opts).format(d);
}

/** ICU writes "8 de oct. de 2026"; the UI uses the compact "8 oct 2026". */
const compact = (s: string) => s.replace(/\./g, '').replace(/ de /g, ' ');

/** "8 de octubre de 2026" */
export const fmtLongDate = (value: string | Date, locale = LOCALE) => format(value, { day: 'numeric', month: 'long', year: 'numeric' }, locale);

/** "8 oct 2026" */
export const fmtShortDate = (value: string | Date, locale = LOCALE) => compact(format(value, { day: 'numeric', month: 'short', year: 'numeric' }, locale));

/** "8 oct" */
export const fmtDayMonth = (value: string | Date, locale = LOCALE) => compact(format(value, { day: 'numeric', month: 'short' }, locale));

/** "oct 2026" */
export const fmtMonthYear = (value: string | Date, locale = LOCALE) => compact(format(value, { month: 'short', year: 'numeric' }, locale));

/** "0x1234…abcd" */
export function shortAddress(address: string, head = 6, tail = 4): string {
  return address.length > head + tail + 1 ? `${address.slice(0, head)}…${address.slice(-tail)}` : address;
}

/** "+$1,234.00" / "-$56.00" */
export function signedUSD(n: number): string {
  return `${n < 0 ? '-' : '+'}${fmtUSD2(Math.abs(n))}`;
}

/** "+8.4%" / "-3.1%" */
export function signedPct(n: number, digits = 1): string {
  return `${n < 0 ? '-' : '+'}${Math.abs(n).toFixed(digits)}%`;
}

/** Singular/plural text: `<key>_one` for 1, `<key>_other` otherwise, with `{{count}}` filled. */
export function plural(t: Translator['t'], key: string, count: number, vars: Record<string, string | number> = {}): string {
  return t(`${key}_${count === 1 ? 'one' : 'other'}`, { count, ...vars });
}

/** Signed tone for a delta: positive, negative or neutral (zero / unknown). */
export function tone(n: number | null | undefined): boolean | null {
  if (n == null || n === 0) return null;
  return n > 0;
}

// distributionFrequency is free text set by admins (default "Mensual").
const FREQUENCY_DAYS: ReadonlyArray<readonly [RegExp, number]> = [
  [/semanal|weekly/i, 7],
  [/quincenal|biweekly/i, 15],
  [/bimestral/i, 61],
  [/trimestral|quarterly/i, 91],
  [/cuatrimestral/i, 122],
  [/semestral/i, 182],
  [/anual|yearly|annual/i, 365],
  [/mensual|monthly/i, 30],
];

/** Length in days of a distribution period, or null when the text is not a known cadence. */
export function frequencyDays(frequency: string): number | null {
  for (const [rx, days] of FREQUENCY_DAYS) if (rx.test(frequency)) return days;
  return null;
}

export type ApiCategory = 'autos' | 'campos' | 'drones' | 'inmuebles' | 'edificios';

export const CATEGORY_LABEL: Record<ApiCategory, AssetCategory> = {
  autos: 'Autos', campos: 'Campos', drones: 'Drones', inmuebles: 'Inmuebles', edificios: 'Edificios',
};

export const CATEGORY_COLOR: Record<AssetCategory, string> = {
  Campos: '#4ade80', Autos: '#3078ff', Drones: '#f5a623', Edificios: '#8247E5', Inmuebles: '#2775CA',
};
