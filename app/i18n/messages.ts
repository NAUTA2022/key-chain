import { DEFAULT_LANG, type Lang } from './config';

/*
 * Translation dictionaries: one JSON per language and namespace,
 *   app/i18n/locales/<lang>/<namespace>.json
 * Nested keys ("hero.title"), `{{name}}` placeholders, and arrays/objects for lists.
 *
 * Spanish is bundled (it is the source language and what the prerender writes);
 * the other languages are fetched on demand the first time they are chosen.
 *
 * ── Connecting a translation service ─────────────────────────────────────────
 * `loadMessages` is the only place that reads the dictionaries. To serve them from
 * a translation management system (Crowdin, Lokalise, Locize, Phrase, an own API…),
 * replace its body with a fetch that returns the same shape: { [namespace]: json }.
 * The JSON files use the i18next format, which those services import and export.
 */

export type MessageValue = string | number | boolean | null | MessageValue[] | { [key: string]: MessageValue };
export type Dict = { [key: string]: MessageValue };
export type Messages = Record<string, Dict>;

const nsOf = (path: string) => path.slice(path.lastIndexOf('/') + 1, -'.json'.length);

const SOURCE = import.meta.glob<Dict>('./locales/es/*.json', { eager: true, import: 'default' });
const LAZY = import.meta.glob<Dict>(['./locales/en/*.json', './locales/ar/*.json'], { import: 'default' });

/** The source dictionaries (Spanish), available synchronously. */
export const SOURCE_MESSAGES: Messages = Object.fromEntries(Object.entries(SOURCE).map(([p, d]) => [nsOf(p), d]));

const cache = new Map<Lang, Messages>([[DEFAULT_LANG, SOURCE_MESSAGES]]);

/** Every namespace of a language. Single entry point for dictionaries (see the note above). */
export async function loadMessages(lang: Lang): Promise<Messages> {
  const hit = cache.get(lang);
  if (hit) return hit;
  const prefix = `./locales/${lang}/`;
  const entries = await Promise.all(
    Object.entries(LAZY).filter(([p]) => p.startsWith(prefix)).map(async ([p, load]) => [nsOf(p), await load()] as const),
  );
  const messages: Messages = Object.fromEntries(entries);
  cache.set(lang, messages);
  return messages;
}

/** Value at a dotted path ("hero.title") inside a dictionary. */
export function lookup(dict: Dict | undefined, key: string): MessageValue | undefined {
  let cur: MessageValue | undefined = dict;
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
    cur = (cur as Dict)[part];
  }
  return cur;
}

/** Fills `{{name}}` placeholders. */
export function interpolate(text: string, vars?: Record<string, string | number>): string {
  return vars ? text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
}
