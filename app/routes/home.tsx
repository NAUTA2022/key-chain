import { useNavigate } from 'react-router';
import type { Route } from './+types/home';
import BrikmeLanding from '~/features/landing/brikme/BrikmeLanding';
import { heroModelUrl } from '~/features/landing/brikme/heroItems';
import { seo } from '~/lib/seo';
import type { RouteHandle } from '~/root';
import { DEV_LOGIN, startDevSession } from '~/lib/devLogin';
import { HOME_PATH } from '~/lib/navigation';

// The Brikme landing is always light (brand manual: colours designed for white).
export const handle: RouteHandle = { theme: 'light' };

// The hero opens on the collector car: its model downloads alongside the JS instead of after it.
export const links: Route.LinksFunction = () => [
  { rel: 'preload', href: heroModelUrl('car'), as: 'fetch', crossOrigin: 'anonymous' },
];

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Real World Tokenization: la nueva era de la inversión tokenizada',
    description: 'Invierte en activos del mundo real tokenizados (real estate, energía, minería, agricultura, transporte y lujo) desde $200 USD, o tokeniza tu activo con Brikme. Registrada y licenciada en Dubái (VARA).',
    path: '/',
  });

export default function HomeRoute() {
  const navigate = useNavigate();
  // "Entrar dev" (no wallet): development builds in demo mode only.
  const onDevEnter = DEV_LOGIN ? () => { startDevSession(); navigate(HOME_PATH); } : undefined;
  return <BrikmeLanding onEnter={() => navigate('/ingresar')} onDevEnter={onDevEnter} />;
}
