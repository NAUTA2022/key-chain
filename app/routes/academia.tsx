import type { Route } from './+types/academia';
import Academy from '~/pages/Academy';
import { useNav } from '~/lib/navigation';
import { breadcrumbs, seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Academia: aprende sobre tokenización y RWA',
    description: 'Guías y artículos sobre tokenización de activos reales (RWA), inversión en tokens, mercado secundario, vesting y finanzas descentralizadas.',
    path: '/academia',
    jsonLd: [breadcrumbs([{ name: 'Inicio', path: '/' }, { name: 'Academia', path: '/academia' }])],
  });

export default function AcademiaRoute() {
  const nav = useNav();
  return <Academy nav={nav} />;
}
