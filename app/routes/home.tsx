import { useNavigate } from 'react-router';
import type { Route } from './+types/home';
import Landing from '~/features/landing/Landing';
import { seo } from '~/lib/seo';
import type { RouteHandle } from '~/root';
import { DEV_LOGIN, startDevSession } from '~/lib/devLogin';
import { HOME_PATH } from '~/lib/navigation';

// The landing is always dark, whatever theme the app itself is set to.
export const handle: RouteHandle = { theme: 'dark' };

// Brand icon for the tab.
export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/la33/la33-icon.svg', type: 'image/svg+xml' },
];

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'La 33 · Tokenización B2B de activos tangibles en Panamá',
    description: 'La 33 tokeniza inmuebles, fincas, energía y otros activos tangibles de empresas en Panamá y los conecta con inversionistas verificados en un marketplace multi-proyecto.',
    path: '/',
  });

export default function HomeRoute() {
  const navigate = useNavigate();
  // "Entrar dev" (no wallet): development builds in demo mode only.
  const onDevEnter = DEV_LOGIN ? () => { startDevSession(); navigate(HOME_PATH); } : undefined;
  return <Landing onEnter={() => navigate('/ingresar')} onDevEnter={onDevEnter} />;
}
