import type { Route } from './+types/ecosistema';
import ComingSoon from '~/components/ComingSoon';
import Ecosystem from '~/features/ecosystem/Ecosystem';
import { useNav } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import { breadcrumbs, seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Ecosistema de tokenización: próximamente',
    description: 'Muy pronto: el mapa del ecosistema de activos reales tokenizados por país, sector, empresa y proyecto.',
    path: '/ecosistema',
    noindex: true,
    jsonLd: [breadcrumbs([{ name: 'Inicio', path: '/' }, { name: 'Ecosistema', path: '/ecosistema' }])],
  });

// Demo mode shows the interactive 2D map (features/ecosystem) with its demo data.
// Live mode keeps "coming soon" until the map reads real data from the API.
export default function EcosistemaRoute() {
  const nav = useNav();
  const live = useSession().status !== 'disabled';
  if (!live) return <Ecosystem nav={nav} />;
  return (
    <ComingSoon
      nav={nav}
      title="Ecosistema Brikme"
      description="Estamos preparando el mapa interactivo del ecosistema: países, sectores, empresas y proyectos tokenizados, con su marco regulatorio y datos verificados."
      highlights={['Mapa por país y sector', 'Empresas emisoras y sus proyectos', 'Marco regulatorio de cada jurisdicción']}
    />
  );
}
