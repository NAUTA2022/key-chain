import type { Route } from './+types/token';
import TokenUtility from '~/pages/TokenUtility';
import { useNav } from '~/lib/navigation';
import { breadcrumbs, seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Token de la plataforma: utilidad, rondas y tokenomics',
    description: 'Conocé la utilidad del token de la plataforma: descuentos en fees, acceso anticipado a proyectos, gobernanza y staking. Rondas, vesting y distribución.',
    path: '/token',
    jsonLd: [breadcrumbs([{ name: 'Inicio', path: '/' }, { name: 'Token', path: '/token' }])],
  });

export default function TokenRoute() {
  const nav = useNav();
  return <TokenUtility nav={nav} />;
}
