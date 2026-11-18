import { useNavigate } from 'react-router';
import type { Route } from './+types/home';
import Landing from '~/features/landing/Landing';
import { seo } from '~/lib/seo';
import type { RouteHandle } from '~/root';
import { DEV_LOGIN, startDevSession } from '~/lib/devLogin';
import { HOME_PATH } from '~/lib/navigation';

// The landing is always dark, whatever theme the app itself is set to.
export const handle: RouteHandle = { theme: 'dark' };

// Hero illustration is the landing's LCP element.
export const links: Route.LinksFunction = () => [
  { rel: 'preload', href: '/3ds.webp', as: 'image', type: 'image/webp', fetchPriority: 'high' },
];

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Tokenización de activos reales (RWA) en Polygon',
    description: 'Tokenizá e invertí en activos reales: autos, campos, drones, inmuebles y edificios tokenizados en Polygon, desde cualquier monto y con rendimientos mensuales en USDC.',
    path: '/',
  });

export default function HomeRoute() {
  const navigate = useNavigate();
  // "Entrar dev" (no wallet): development builds in demo mode only.
  const onDevEnter = DEV_LOGIN ? () => { startDevSession(); navigate(HOME_PATH); } : undefined;
  return <Landing onEnter={() => navigate('/ingresar')} onDevEnter={onDevEnter} />;
}
