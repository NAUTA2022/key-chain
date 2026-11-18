import type { Route } from './+types/bookey';
import Bookey from '~/features/bookey/Bookey';
import type { RouteHandle } from '~/root';
import { seo } from '~/lib/seo';
import { productAppJsonLd } from '~/lib/structured-data';

export const handle: RouteHandle = { theme: 'light' };

const DESCRIPTION = 'Reservá estadías en propiedades tokenizadas con descuentos para inversores. Buscá por destino, fechas y huéspedes.';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Bookey: reservas de propiedades tokenizadas',
    description: DESCRIPTION,
    path: '/bookey',
    jsonLd: [productAppJsonLd({ name: 'Bookey', path: '/bookey', description: DESCRIPTION, category: 'TravelApplication' })],
  });

export default function Page() {
  return <Bookey />;
}
