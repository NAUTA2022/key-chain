import type { Route } from './+types/mercado-secundario';
import LiveSecondaryMarket from '~/features/market/LiveSecondaryMarket';
import SecondaryMarket from '~/pages/SecondaryMarket';
import { useNav } from '~/lib/navigation';
import { usePreferences } from '~/lib/preferences';
import { useSession } from '~/lib/session';
import { breadcrumbs, seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Mercado secundario P2P de tokens',
    description: 'Comprá y vendé tokens de activos reales entre inversores. Compará el precio pedido con el valor real de cada token y encontrá oportunidades con descuento.',
    path: '/mercado-secundario',
    jsonLd: [breadcrumbs([{ name: 'Inicio', path: '/' }, { name: 'Mercado secundario', path: '/mercado-secundario' }])],
  });

export default function MercadoSecundarioRoute() {
  const nav = useNav();
  const { prefs } = usePreferences();
  // Live: real offers from the on-chain market contract (FactorActSecondaryMarket).
  if (useSession().status !== 'disabled') return <LiveSecondaryMarket nav={nav} rubro={prefs.rubro} />;
  return <SecondaryMarket nav={nav} rubro={prefs.rubro} />;
}
