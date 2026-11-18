import type { Route } from './+types/key-rural';
import KeyRural from '~/features/key-rural/KeyRural';
import type { RouteHandle } from '~/root';
import { seo } from '~/lib/seo';
import { productAppJsonLd } from '~/lib/structured-data';

export const handle: RouteHandle = { theme: 'light' };

const DESCRIPTION = 'Invertí en campos y activos agropecuarios tokenizados: tierras productivas, cultivos y maquinaria con rendimientos en USDC.';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Key Rural: campos y activos agropecuarios tokenizados',
    description: DESCRIPTION,
    path: '/key-rural',
    jsonLd: [productAppJsonLd({ name: 'Key Rural', path: '/key-rural', description: DESCRIPTION, category: 'FinanceApplication' })],
  });

export default function Page() {
  return <KeyRural />;
}
