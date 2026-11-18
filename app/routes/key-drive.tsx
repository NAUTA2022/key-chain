import type { Route } from './+types/key-drive';
import KeyDrive from '~/features/key-go/KeyDrive';
import type { RouteHandle } from '~/root';
import { seo } from '~/lib/seo';
import { productAppJsonLd } from '~/lib/structured-data';

export const handle: RouteHandle = { theme: 'dark' };

const DESCRIPTION = 'Pedí viajes en autos tokenizados y seguí tu recorrido en tiempo real, con pagos integrados en KEY CHAIN.';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Key Go: viajes en autos tokenizados',
    description: DESCRIPTION,
    path: '/key-drive',
    jsonLd: [productAppJsonLd({ name: 'Key Go', path: '/key-drive', description: DESCRIPTION, category: 'TravelApplication' })],
  });

export default function Page() {
  return <div style={{ minHeight: '100vh', background: 'var(--bg)' }}><KeyDrive /></div>;
}
