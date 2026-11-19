import { useEffect, useRef, useState } from 'react';
import { LANGS, LANG_META } from './config';
import { useLanguage, useT } from './useT';

type Props = {
  /** `dark`: over the landing hero / dark bands; `light`: light backgrounds; `bar`: the platform top bar. */
  variant?: 'dark' | 'light' | 'bar';
  className?: string;
};

const Globe = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
  </svg>
);

/** Language button: shows the active language and opens the list (Español · English · العربية). */
export default function LanguageSwitcher({ variant = 'light', className = '' }: Props) {
  const { lang, setLang } = useLanguage();
  const { t } = useT('common');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  return (
    <div ref={box} className={`lang-switch lang-switch-${variant} ${className}`}>
      <button type="button" className="lang-switch-btn" aria-haspopup="listbox" aria-expanded={open}
        aria-label={t('language.choose')} title={t('language.choose')} onClick={() => { setOpen(o => !o); }}>
        {Globe}<span>{LANG_META[lang].short}</span>
      </button>
      {open && (
        <ul className="lang-switch-menu" role="listbox" aria-label={t('language.choose')}>
          {LANGS.map(l => (
            <li key={l}>
              <button type="button" role="option" aria-selected={l === lang} lang={l} dir={LANG_META[l].dir}
                className={l === lang ? 'is-on' : ''} onClick={() => { setLang(l); setOpen(false); }}>
                <span className="lang-switch-code">{LANG_META[l].short}</span>{LANG_META[l].name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
