import { useSearchParams } from 'react-router';
import type { Route } from './+types/inquilino';
import ComingSoon from '~/components/ComingSoon';
import TenantPortal from '~/pages/TenantPortal';
import { RWA_ASSETS } from '~/data';
import { useNav } from '~/lib/navigation';
import { useSession } from '~/lib/session';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Portal del inquilino', path: '/inquilino', noindex: true });

export default function Page() {
  const nav = useNav();
  const [params] = useSearchParams();
  if (useSession().status !== 'disabled') {
    return (
      <ComingSoon
        nav={nav}
        title="Portal del inquilino"
        description="Pronto quienes alquilan propiedades tokenizadas van a poder pagar, ver contratos y reportar mantenimiento desde acá."
        highlights={['Pagos de alquiler en USDC', 'Contrato y comprobantes', 'Reportes de mantenimiento al operador']}
      />
    );
  }
  const property = RWA_ASSETS.find(a => String(a.id) === params.get('activo'));
  return <TenantPortal nav={nav} property={property} />;
}
