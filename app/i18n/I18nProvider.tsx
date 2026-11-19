import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LANG, LANG_META, LANG_STORAGE_KEY, isLang, type Lang } from './config';
import { I18nContext, type I18nState } from './context';
import { SOURCE_MESSAGES, loadMessages, type Messages } from './messages';

/** The language the visitor chose before (?lang= in the URL wins, then the saved choice). */
function storedLang(): Lang {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (isLang(fromUrl)) return fromUrl;
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch { /* storage blocked */ }
  return DEFAULT_LANG;
}

function applyToDocument(lang: Lang) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = LANG_META[lang].dir;
}

/**
 * Holds the active language and its dictionaries. The first render is always Spanish
 * (it matches the prerendered HTML); the saved language is applied right after.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ lang: Lang; messages: Messages }>({ lang: DEFAULT_LANG, messages: SOURCE_MESSAGES });

  useEffect(() => {
    const lang = storedLang();
    if (lang === DEFAULT_LANG) return;
    let alive = true;
    void loadMessages(lang).then(messages => { if (alive) { setState({ lang, messages }); applyToDocument(lang); } });
    return () => { alive = false; };
  }, []);

  const value = useMemo<I18nState>(() => ({
    ...state,
    setLang: (lang: Lang) => {
      try { window.localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /* storage blocked */ }
      void loadMessages(lang).then(messages => { setState({ lang, messages }); applyToDocument(lang); });
    },
  }), [state]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
