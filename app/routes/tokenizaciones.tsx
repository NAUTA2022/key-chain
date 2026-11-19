import type { Route } from './+types/tokenizaciones';
import PrimaryMarket from '~/pages/PrimaryMarket';
import { useNav } from '~/lib/navigation';
import { usePreferences } from '~/lib/preferences';
import { breadcrumbs, seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Tokenizaciones: invierte en activos reales',
    description: 'Explora proyectos de activos reales tokenizados en Polygon: autos, campos, drones, inmuebles y edificios. Compara valuación, precio por token y rendimiento anual.',
    path: '/tokenizaciones',
    jsonLd: [breadcrumbs([{ name: 'Inicio', path: '/' }, { name: 'Tokenizaciones', path: '/tokenizaciones' }])],
  });

export default function TokenizacionesRoute() {
  const nav = useNav();
  const { prefs } = usePreferences();
  return <PrimaryMarket nav={nav} rubro={prefs.rubro} />;
}
