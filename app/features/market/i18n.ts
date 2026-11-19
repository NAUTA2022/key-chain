import type { ReactNode } from 'react';
import { SOURCE_MESSAGES, interpolate, lookup } from '~/i18n/messages';
import { useT } from '~/i18n/useT';

/**
 * Display text of a data value kept in Spanish (category, stage, country) from the `common`
 * namespace; values without a translation (live countries, companies) show as they are, and
 * 'Todos' is the shared "all" label.
 */
export function useDataLabel(): (group: 'categories' | 'stages' | 'countries', value: string) => string {
  const { t, raw } = useT('common');
  return (group, value) => (value === 'Todos' ? t('all') : raw<string | undefined>(`${group}.${value}`) ?? value);
}

/** Same signature as `useT(...).t`: modules outside React receive it as a parameter. */
export type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** Spanish (source) text of a `market` key: the default for modules that run outside React. */
export const sourceT: TFn = (key, vars) => {
  const v = lookup(SOURCE_MESSAGES.market, key);
  return typeof v === 'string' ? interpolate(v, vars) : key;
};

/**
 * An error whose text lives in the `market` namespace (`key` + `vars`). Its `message` is the
 * Spanish source text, so code that only reads `message` keeps working; screens translate it
 * with {@link errorText}.
 */
export class MarketError extends Error {
  readonly key: string;
  readonly vars?: Record<string, string | number>;
  constructor(key: string, vars?: Record<string, string | number>, options?: ErrorOptions) {
    super(sourceT(key, vars), options);
    this.key = key;
    this.vars = vars;
  }
}

/** Text of a caught error in the active language (`fallbackKey` when it carries no message). */
export function errorText(e: unknown, t: TFn, fallbackKey: string): string {
  if (e instanceof MarketError) return t(e.key, e.vars);
  return e instanceof Error && e.message ? e.message : t(fallbackKey);
}

/**
 * A translated text with `<b>…</b>` spans: the plain parts stay strings and each span goes
 * through `wrap` (e.g. `<strong>`). Lets one key hold a whole sentence with its emphasis.
 */
export function richText(text: string, wrap: (chunk: string, key: number) => ReactNode): ReactNode[] {
  return text.split(/<b>(.*?)<\/b>/g).map((part, i) => (i % 2 ? wrap(part, i) : part));
}
