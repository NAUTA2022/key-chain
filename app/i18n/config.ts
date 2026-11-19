/** Languages of the site. Spanish is the source language (and the prerendered one). */
export const LANGS = ['es', 'en', 'ar'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'es';

/** How each language is shown in the switcher, and its writing direction. */
export const LANG_META: Record<Lang, { name: string; short: string; dir: 'ltr' | 'rtl'; locale: string }> = {
  es: { name: 'Español', short: 'ES', dir: 'ltr', locale: 'es-AR' },
  en: { name: 'English', short: 'EN', dir: 'ltr', locale: 'en-US' },
  ar: { name: 'العربية', short: 'AR', dir: 'rtl', locale: 'ar-AE' },
};

/** Where the visitor's choice is kept (also read before first paint, see LANG_BOOT in root.tsx). */
export const LANG_STORAGE_KEY = 'bk_lang';

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);
