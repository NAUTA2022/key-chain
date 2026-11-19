import { createContext } from 'react';
import { DEFAULT_LANG, type Lang } from './config';
import { SOURCE_MESSAGES, type Messages } from './messages';

export type I18nState = { lang: Lang; messages: Messages; setLang: (lang: Lang) => void };

export const I18nContext = createContext<I18nState>({ lang: DEFAULT_LANG, messages: SOURCE_MESSAGES, setLang: () => {} });
