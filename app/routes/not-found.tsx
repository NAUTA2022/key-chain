import type { Route } from './+types/not-found';
import { StatusPage } from '~/components/StatusPage';
import { seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () => seo({ title: 'Página no encontrada', path: '/404', noindex: true });

export default function NotFound() {
  return <StatusPage code="404" title="Página no encontrada" message="La página que buscas no existe o fue movida." />;
}
