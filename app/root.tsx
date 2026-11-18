import type { ReactNode } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useMatches } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import type { Route } from './+types/root';
import { PreferencesProvider } from '~/lib/preferences';
import { DEFAULT_DESCRIPTION, SITE_LANG, SITE_NAME, absoluteUrl } from '~/lib/site';
import { organizationJsonLd, safeJson, websiteJsonLd } from '~/lib/structured-data';
import { StatusPage } from '~/components/StatusPage';
import '~/styles/global.css';

/** Routes can force a theme (e.g. light-only products) through their `handle`. */
export type RouteHandle = { theme?: 'dark' | 'light' };

const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Inter:wght@400;450;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&family=Sora:wght@400;600;700;800&display=swap';

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
const THEME_BOOT = `try{var p=JSON.parse(localStorage.getItem('kc_prefs')||'{}'),r=document.documentElement;if(p.theme)r.setAttribute('data-theme',p.theme);if(p.palette)r.setAttribute('data-palette',p.palette)}catch(e){}`;

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
    <html lang={SITE_LANG} data-theme={forced ?? 'light'} data-palette="mono" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#090909" />
        <meta name="application-name" content={SITE_NAME} />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        {!forced && <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />}
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
    <PreferencesProvider>
      <Outlet />
      <Analytics />
      <SpeedInsights />
    </PreferencesProvider>
  );
}

export function HydrateFallback() {
  return null;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <StatusPage code="404" title="Página no encontrada" message="La página que buscás no existe o fue movida." />;
  }
  const detail = import.meta.env.DEV && error instanceof Error ? error.message : undefined;
  return <StatusPage code="Error" title="Algo salió mal" message="Ocurrió un error inesperado. Probá recargar la página." detail={detail} />;
}
