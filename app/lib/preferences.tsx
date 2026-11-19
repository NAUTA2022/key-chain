import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

export type Theme = 'dark' | 'light';
export type Palette = 'la33' | 'mono' | 'verde' | 'rojo' | 'azul' | 'marron';
export type FontPreset = 'moderna' | 'geometrica' | 'humanista' | 'tech';
export type Role = 'investor' | 'admin';

export type Prefs = { palette: Palette; font: FontPreset; rubro: string };
export type PrefsUpdater = Partial<Prefs> | ((current: Prefs) => Partial<Prefs>);

type PreferencesValue = {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  prefs: Prefs;
  setPrefs: (u: PrefsUpdater) => void;
  role: Role;
  setRole: Dispatch<SetStateAction<Role>>;
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
};

export const FONTS: Record<FontPreset, { h: string; b: string }> = {
  moderna:    { h: '"DM Sans", sans-serif',       b: '"Inter", sans-serif' },
  geometrica: { h: '"Space Grotesk", sans-serif', b: '"IBM Plex Sans", sans-serif' },
  humanista:  { h: '"Manrope", sans-serif',       b: '"Sora", sans-serif' },
  tech:       { h: '"Space Grotesk", sans-serif', b: '"IBM Plex Mono", monospace' },
};

// Renamed from 'kc_prefs' for La 33: browsers that stored the old light default start in dark again.
const STORAGE_KEY = 'la33_prefs';
type Stored = { theme?: Theme; palette?: Palette; font?: FontPreset; collapsed?: boolean };

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

/**
 * Platform-wide UI preferences (theme, palette, font, sidebar state, role).
 * Lives above the router outlet so it survives navigation between pages,
 * replacing the state that used to live inside the monolithic App component.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  // Dark by default (La 33 brand: black background, orange accent).
  const [theme, setTheme] = useState<Theme>('dark');
  const [palette, setPalette] = useState<Palette>('la33');
  const [font, setFont] = useState<FontPreset>('moderna');
  const [rubro, setRubro] = useState('Todos');
  const [role, setRole] = useState<Role>('investor');
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore persisted choices after hydration so the prerendered HTML and the
  // first client render always match.
  useEffect(() => {
    const s = readStored();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore after hydration keeps prerendered HTML and first client render identical */
    if (s.theme) setTheme(s.theme);
    if (s.palette) setPalette(s.palette);
    if (s.font) setFont(s.font);
    if (typeof s.collapsed === 'boolean') setCollapsed(s.collapsed);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, palette, font, collapsed } satisfies Stored));
    } catch {
      /* storage unavailable (private mode) — preferences stay in memory */
    }
  }, [hydrated, theme, palette, font, collapsed]);

  const setPrefs = useCallback((updater: PrefsUpdater) => {
    const current: Prefs = { palette, font, rubro };
    const next = typeof updater === 'function' ? updater(current) : updater;
    if (next.palette !== undefined && next.palette !== palette) setPalette(next.palette);
    if (next.font !== undefined && next.font !== font) setFont(next.font);
    if (next.rubro !== undefined && next.rubro !== rubro) setRubro(next.rubro);
  }, [palette, font, rubro]);

  const value = useMemo<PreferencesValue>(() => ({
    theme, setTheme,
    prefs: { palette, font, rubro }, setPrefs,
    role, setRole,
    collapsed, setCollapsed,
  }), [theme, palette, font, rubro, setPrefs, role, collapsed]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}

/** The landing is always dark, whatever theme the app itself is set to. */
const DARK_ONLY_PATHS: ReadonlySet<string> = new Set(['/']);

/** Applies the user's theme, palette and font to <html> while a Keychain page is mounted. */
export function useApplyPreferences(pathname: string): void {
  const { theme, prefs } = usePreferences();
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', DARK_ONLY_PATHS.has(pathname) ? 'dark' : theme);
    root.setAttribute('data-palette', prefs.palette);
    const f = FONTS[prefs.font];
    root.style.setProperty('--font-h', f.h);
    root.style.setProperty('--font-b', f.b);
  }, [theme, prefs.palette, prefs.font, pathname]);
}
