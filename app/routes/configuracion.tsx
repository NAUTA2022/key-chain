import type { Route } from './+types/configuracion';
import Config from '~/pages/Config';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Configuración', path: '/configuracion', noindex: true });

export default function Page() {
  return <Config />;
}
