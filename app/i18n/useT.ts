import { useContext, useMemo } from 'react';
import { LANG_META } from './config';
import { I18nContext } from './context';
import { SOURCE_MESSAGES, interpolate, lookup, type MessageValue } from './messages';
import type { Lang } from './config';

export type Translator = {
  /** Text at `key` in the namespace, with `{{vars}}` filled; falls back to Spanish, then to the key itself. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Raw value at `key` (arrays and objects for lists), falling back to Spanish. */
  raw: <T = MessageValue>(key: string) => T;
  lang: Lang;
  dir: 'ltr' | 'rtl';
  /** Number/date locale of the active language (for Intl formatting). */
  locale: string;
};

/** Translations of one namespace: `const { t } = useT('landing'); t('hero.title')`. */
export function useT(ns: string): Translator {
  const { lang, messages } = useContext(I18nContext);
  return useMemo<Translator>(() => {
    const dict = messages[ns];
    const source = SOURCE_MESSAGES[ns];
    const pick = (key: string) => lookup(dict, key) ?? lookup(source, key);
    return {
      t: (key, vars) => {
        const v = pick(key);
        if (typeof v === 'string') return interpolate(v, vars);
        if (import.meta.env.DEV) console.warn(`[i18n] missing ${ns}:${key}`);
        return key;
      },
      raw: <T,>(key: string) => pick(key) as T,
      lang,
      dir: LANG_META[lang].dir,
      locale: LANG_META[lang].locale,
    };
  }, [lang, messages, ns]);
}

/** Active language and the setter (for the language switcher). */
export function useLanguage() {
  const { lang, setLang } = useContext(I18nContext);
  return { lang, setLang };
}
