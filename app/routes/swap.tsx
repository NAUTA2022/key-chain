import type { Route } from './+types/swap';
import ComingSoon from '~/components/ComingSoon';
import Swap from '~/pages/Swap';
import { useNav } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Swap', path: '/swap', noindex: true });

export default function Page() {
  const nav = useNav();
  const live = useSession().status !== 'disabled';
  if (live) {
    return (
      <ComingSoon
        nav={nav}
        title="Swap de tokens"
        description="Muy pronto vas a poder intercambiar USDC y otros tokens sin salir de La 33, con cotización en tiempo real."
        highlights={['Cotización y ruta óptima antes de confirmar', 'Firmás desde tu propia wallet', 'Historial de intercambios en tu cuenta']}
        cta={{ label: 'Ir a Mis pertenencias', route: 'pertenencias' }}
      />
    );
  }
  return <Swap nav={nav} />;
}
