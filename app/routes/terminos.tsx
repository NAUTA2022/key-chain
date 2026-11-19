import type { Route } from './+types/terminos';
import Legal from '~/pages/Legal';
import { TERMS } from '~/pages/legal-content';
import { breadcrumbs, seo } from '~/lib/seo';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Términos y condiciones',
    description: 'Términos y condiciones de uso de la plataforma La 33 de inversión en activos reales tokenizados.',
    path: '/terminos',
    jsonLd: [breadcrumbs([{ name: 'Inicio', path: '/' }, { name: 'Términos y condiciones', path: '/terminos' }])],
  });

export default function TerminosRoute() {
  return <Legal title="Términos y condiciones" intro="Estas condiciones regulan el uso de La 33. Al crear tu cuenta y aceptar esta versión, aceptás estos términos." sections={TERMS} />;
}
