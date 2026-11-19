import type { ReactNode } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useMatches } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import type { Route } from './+types/root';
import { PreferencesProvider } from '~/lib/preferences';
import { I18nProvider } from '~/i18n/I18nProvider';
import { LANG_STORAGE_KEY } from '~/i18n/config';
import { DEFAULT_DESCRIPTION, SITE_LANG, SITE_NAME, absoluteUrl } from '~/lib/site';
import { organizationJsonLd, safeJson, websiteJsonLd } from '~/lib/structured-data';
import { RouteErrorPage } from '~/components/StatusPage';
import '~/styles/global.css';

/** Routes can force a theme (e.g. light-only products) through their `handle`. */
export type RouteHandle = { theme?: 'dark' | 'light' };

const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Inter:wght@400;450;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&family=Sora:wght@400;600;700;800&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  { rel: 'stylesheet', href: GOOGLE_FONTS },
  { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
  { rel: 'icon', href: '/icon-192.png', type: 'image/png', sizes: '192x192' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/site.webmanifest' },
];

// Restores the visitor's saved theme before first paint (no light/dark flash).
// Only runs on routes that don't force their own theme.
const THEME_BOOT = `try{var p=JSON.parse(localStorage.getItem('bk_prefs')||'{}'),r=document.documentElement;if(p.theme)r.setAttribute('data-theme',p.theme);if(p.palette)r.setAttribute('data-palette',p.palette)}catch(e){}`;

// Applies the saved language's lang/dir before first paint (Arabic opens right-to-left at once).
const LANG_BOOT = `try{var q=new URLSearchParams(location.search).get('lang'),l=q||localStorage.getItem('${LANG_STORAGE_KEY}');if(l==='en'||l==='ar'){var r=document.documentElement;r.lang=l;r.dir=l==='ar'?'rtl':'ltr'}}catch(e){}`;

function useForcedTheme(): 'dark' | 'light' | undefined {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i].handle as RouteHandle | undefined;
    if (handle?.theme) return handle.theme;
  }
  return undefined;
}

export function Layout({ children }: { children: ReactNode }) {
  const forced = useForcedTheme();
  return (
    <html lang={SITE_LANG} data-theme={forced ?? 'light'} data-palette="brikme" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="application-name" content={SITE_NAME} />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        {!forced && <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />}
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT }} />
        <Meta />
        <Links />
        <link rel="alternate" type="text/plain" title="LLMs" href={absoluteUrl('/llms.txt')} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson([organizationJsonLd(), websiteJsonLd()]) }} />
      </head>
      <body>
        <div id="root">{children}</div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export const meta: Route.MetaFunction = () => [
  { title: SITE_NAME },
  { name: 'description', content: DEFAULT_DESCRIPTION },
  // Only reached by the SPA fallback (signed-in areas); every public route sets its own robots tag.
  { name: 'robots', content: 'noindex, follow' },
];

export default function App() {
  return (
    <I18nProvider>
      <PreferencesProvider>
        <Outlet />
        <Analytics />
        <SpeedInsights />
      </PreferencesProvider>
    </I18nProvider>
  );
}

export function HydrateFallback() {
  return null;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  // Texts come from the `common` dictionaries (status.notFound / status.error).
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <RouteErrorPage notFound />;
  }
  const detail = import.meta.env.DEV && error instanceof Error ? error.message : undefined;
  return <RouteErrorPage notFound={false} detail={detail} />;
}
